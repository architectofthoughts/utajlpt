import { db, getMeta, setMeta } from './db';
import type { VocabEntry } from '../types';

const VOCAB_URL = '/data/vocab.json';
const META_VERSION_KEY = 'vocab.version';

export interface VocabBundle {
  version: string;
  generatedAt: string;
  entries: VocabEntry[];
}

let memoryCache: VocabEntry[] | null = null;

export async function ensureVocabLoaded(): Promise<void> {
  const localVersion = await getMeta<string>(META_VERSION_KEY);
  // Default cache mode — let SW NetworkFirst rule decide. The bust query
  // string forces a unique URL per build so the legacy CacheFirst SW (still
  // active on existing devices) can't return stale content.
  const url = `${VOCAB_URL}?bust=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`vocab.json fetch failed: ${res.status}`);
  const bundle: VocabBundle = await res.json();
  if (bundle.version === localVersion) return;
  await db.transaction('rw', db.vocab, db.meta, async () => {
    await db.vocab.clear();
    await db.vocab.bulkPut(bundle.entries);
    await setMeta(META_VERSION_KEY, bundle.version);
  });
  memoryCache = null;
}

/** Aggressive nuke — clears all SW caches, IndexedDB tables, and reloads. */
export async function hardReset(): Promise<void> {
  try {
    if ('caches' in self) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
  } catch {
    // ignore — caches API can throw in private browsing
  }
  try {
    await db.delete();
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export async function getAllVocab(): Promise<VocabEntry[]> {
  if (memoryCache) return memoryCache;
  memoryCache = await db.vocab.toArray();
  return memoryCache;
}

export async function getVocabById(id: string): Promise<VocabEntry | undefined> {
  return db.vocab.get(id);
}

export async function searchVocab(query: string, limit = 50): Promise<VocabEntry[]> {
  const all = await getAllVocab();
  if (!query.trim()) return all.slice(0, limit);
  const q = query.toLowerCase();
  const scored: { entry: VocabEntry; score: number }[] = [];
  for (const e of all) {
    const k = e.kanji;
    const r = e.reading;
    const m = e.meanings.join(' ').toLowerCase();
    let score = 0;
    if (k === query || r === query) score = 100;
    else if (k.includes(query) || r.includes(query)) score = 50;
    else if (m.includes(q)) score = 10;
    if (score > 0) scored.push({ entry: e, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.entry.freqRank ?? 9e9) - (b.entry.freqRank ?? 9e9));
  return scored.slice(0, limit).map(s => s.entry);
}

export function clearVocabMemoryCache(): void {
  memoryCache = null;
}
