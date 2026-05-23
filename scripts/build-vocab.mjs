#!/usr/bin/env node
// Build script — produces public/data/vocab.json from JMdict-simplified
// (eng-common as the base + eng-full to fill in JLPT entries that are
// absent from the common subset) merged with Bluskyo JLPT level tags.
//
// Strategy:
//   1. Iterate JMdict-eng-common, output every entry with meanings, attach
//      JLPT tag if it matches a Bluskyo (kanji|reading) variant.
//   2. For Bluskyo (kanji|reading) variants not yet matched, look them up
//      in JMdict-eng (full) and add as JLPT-only entries with real meanings.
//   3. Drop any Bluskyo variant we still can't resolve (no `(meaning pending)`
//      stubs in the output).
//
// Idempotent: cached downloads in scripts/.cache/.

import { mkdir, readFile, writeFile, stat, rm, readdir } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { extract as tarExtract } from 'tar';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = dirname(__dirname);
const CACHE = join(__dirname, '.cache');
const OUT_DIR = join(ROOT, 'public', 'data');
const OUT_FILE = join(OUT_DIR, 'vocab.json');

const JMDICT_RELEASE = 'https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest';
const BLUSKYO_URL = 'https://raw.githubusercontent.com/Bluskyo/JLPT_Vocabulary/main/data/vocab/results/JLPT_vocab_ALL.json';

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function fetchToFile(url, dest, label) {
  if (existsSync(dest)) {
    const s = await stat(dest);
    if (s.size > 0) {
      console.log(`[cache] ${label} (${(s.size / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }
  }
  console.log(`[fetch] ${label} ← ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'aimtotopjlpt-build/0.2' }
  });
  if (!res.ok || !res.body) throw new Error(`fetch failed (${res.status}): ${url}`);
  await pipeline(res.body, createWriteStream(dest));
}

async function findJmdictAssets() {
  const meta = await (await fetch(JMDICT_RELEASE)).json();
  const findOne = (re, label) => {
    const a = meta.assets.find(x => re.test(x.name));
    if (!a) throw new Error(`${label} asset not found in latest release`);
    return { url: a.browser_download_url, name: a.name };
  };
  return {
    version: meta.tag_name,
    common: findOne(/^jmdict-eng-common-.*\.json\.tgz$/, 'jmdict-eng-common'),
    full: findOne(/^jmdict-eng-(?!common-)(?!examples-).*\.json\.tgz$/, 'jmdict-eng (full)')
  };
}

async function readJsonFromTgz(tgzPath, label) {
  const tmpDir = join(CACHE, `extracted-${label}`);
  await rm(tmpDir, { recursive: true, force: true });
  await ensureDir(tmpDir);
  await tarExtract({ file: tgzPath, cwd: tmpDir });
  const entries = await readdir(tmpDir);
  const jsonName = entries.find(n => n.endsWith('.json'));
  if (!jsonName) throw new Error(`no .json found in extracted ${label}`);
  const buf = await readFile(join(tmpDir, jsonName), 'utf8');
  return JSON.parse(buf);
}

function extractWordMeanings(word) {
  const meanings = [];
  const posSet = new Set();
  for (const sense of word.sense ?? []) {
    const glosses = (sense.gloss ?? []).map(g => g.text).filter(Boolean);
    if (glosses.length) meanings.push(glosses.join('; '));
    for (const p of sense.partOfSpeech ?? []) posSet.add(p);
  }
  return { meanings, pos: [...posSet] };
}

function bluskyoMatchesForWord(word, bluskyoMap) {
  // Return list of `${keyForm}|${reading}` keys that this JMdict entry hits.
  const kanjiTexts = (word.kanji ?? []).map(k => k.text);
  const kanaTexts = (word.kana ?? []).map(k => k.text);
  const hits = [];
  let bestLevel = 0;

  const tryMatch = (keyForm, reading) => {
    const variants = bluskyoMap[keyForm];
    if (!variants) return;
    const match = variants.find(v => v.reading === reading);
    if (!match) return;
    hits.push(`${keyForm}|${reading}`);
    if (match.level > bestLevel) bestLevel = match.level;
  };

  for (const k of kanjiTexts) {
    for (const r of kanaTexts) tryMatch(k, r);
  }
  for (const r of kanaTexts) tryMatch(r, r);

  return { hits, jlpt: bestLevel > 0 ? `N${bestLevel}` : undefined };
}

function buildEntries(jmdictCommon, jmdictFull, bluskyoMap) {
  const out = [];
  const matchedBluskyo = new Set(); // `${keyForm}|${reading}`

  // Pass 1 — JMdict-eng-common: output everything that has meanings.
  for (const word of jmdictCommon.words) {
    const kanjiText = word.kanji?.[0]?.text ?? word.kana?.[0]?.text ?? '';
    const readingText = word.kana?.[0]?.text ?? '';
    if (!kanjiText) continue;

    const { meanings, pos } = extractWordMeanings(word);
    if (meanings.length === 0) continue;

    const { hits, jlpt } = bluskyoMatchesForWord(word, bluskyoMap);
    for (const h of hits) matchedBluskyo.add(h);

    out.push({
      id: `jm-${word.id}`,
      kanji: kanjiText,
      reading: readingText,
      meanings: meanings.slice(0, 5),
      pos: pos.slice(0, 4),
      jlpt
    });
  }

  const commonCount = out.length;

  // Pass 2 — Index full JMdict by every (keyForm|reading) it covers, and
  // surface only the entries that fill an unmatched Bluskyo variant.
  let augmentedCount = 0;
  for (const word of jmdictFull.words) {
    const { meanings, pos } = extractWordMeanings(word);
    if (meanings.length === 0) continue;

    // Compute Bluskyo coverage for THIS word.
    const kanjiTexts = (word.kanji ?? []).map(k => k.text);
    const kanaTexts = (word.kana ?? []).map(k => k.text);
    const fillTargets = []; // { keyForm, reading, level }

    const tryFill = (keyForm, reading) => {
      const variants = bluskyoMap[keyForm];
      if (!variants) return;
      const match = variants.find(v => v.reading === reading);
      if (!match) return;
      const key = `${keyForm}|${reading}`;
      if (matchedBluskyo.has(key)) return;
      fillTargets.push({ keyForm, reading, level: match.level });
      matchedBluskyo.add(key);
    };

    for (const k of kanjiTexts) {
      for (const r of kanaTexts) tryFill(k, r);
    }
    for (const r of kanaTexts) tryFill(r, r);

    if (fillTargets.length === 0) continue;

    // Pick the easiest level (highest number) for the JLPT tag.
    const bestLevel = Math.max(...fillTargets.map(f => f.level));
    const headKanji = kanjiTexts[0] ?? kanaTexts[0] ?? '';
    const headReading = kanaTexts[0] ?? '';

    out.push({
      id: `jm-${word.id}`,
      kanji: headKanji,
      reading: headReading,
      meanings: meanings.slice(0, 5),
      pos: pos.slice(0, 4),
      jlpt: `N${bestLevel}`
    });
    augmentedCount += 1;
  }

  // Pass 3 — drop unmatched Bluskyo variants entirely (option B).
  let droppedCount = 0;
  for (const [keyForm, variants] of Object.entries(bluskyoMap)) {
    for (const v of variants) {
      if (!matchedBluskyo.has(`${keyForm}|${v.reading}`)) droppedCount += 1;
    }
  }

  // Sort: JLPT N5 first, then N4..N1, then untagged.
  const order = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
  out.sort((a, b) => {
    const oa = a.jlpt ? order[a.jlpt] : 5;
    const ob = b.jlpt ? order[b.jlpt] : 5;
    if (oa !== ob) return oa - ob;
    return a.kanji.localeCompare(b.kanji);
  });

  for (let i = 0; i < out.length; i++) out[i].freqRank = i + 1;

  return { entries: out, commonCount, augmentedCount, droppedCount };
}

async function main() {
  await ensureDir(CACHE);
  await ensureDir(OUT_DIR);

  console.log('→ Resolving JMdict-simplified release…');
  const assets = await findJmdictAssets();
  console.log(`  release: ${assets.version}`);

  const commonTgz = join(CACHE, assets.common.name);
  const fullTgz = join(CACHE, assets.full.name);
  await fetchToFile(assets.common.url, commonTgz, assets.common.name);
  await fetchToFile(assets.full.url, fullTgz, assets.full.name);

  console.log('→ Extracting JMdict-eng-common…');
  const jmdictCommon = await readJsonFromTgz(commonTgz, 'common');
  console.log(`  common: ${jmdictCommon.words.length} entries`);

  console.log('→ Extracting JMdict-eng (full)…');
  const jmdictFull = await readJsonFromTgz(fullTgz, 'full');
  console.log(`  full:   ${jmdictFull.words.length} entries`);

  const bluskyoFile = join(CACHE, 'bluskyo_jlpt_all.json');
  await fetchToFile(BLUSKYO_URL, bluskyoFile, 'Bluskyo JLPT vocab');
  const bluskyoMap = JSON.parse(await readFile(bluskyoFile, 'utf8'));
  console.log(`  Bluskyo JLPT keys: ${Object.keys(bluskyoMap).length}`);

  console.log('→ Merging…');
  const { entries, commonCount, augmentedCount, droppedCount } =
    buildEntries(jmdictCommon, jmdictFull, bluskyoMap);

  const bundle = {
    version: `${assets.version}-${entries.length}`,
    generatedAt: new Date().toISOString(),
    sources: {
      jmdict: assets.version,
      bluskyo: 'main'
    },
    entries
  };

  await writeFile(OUT_FILE, JSON.stringify(bundle));
  const s = await stat(OUT_FILE);
  console.log(`✓ wrote ${OUT_FILE}`);
  console.log(`  entries:        ${entries.length}`);
  console.log(`    from common:    ${commonCount}`);
  console.log(`    augmented:      ${augmentedCount} (filled from full JMdict)`);
  console.log(`    Bluskyo-dropped: ${droppedCount} (no meaning even in full)`);
  console.log(`  size: ${(s.size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
