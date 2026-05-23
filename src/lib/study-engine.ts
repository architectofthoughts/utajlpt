import { db } from './db';
import type { CardOutcome, DeckFilter, ProgressRow, VocabEntry } from '../types';
import { GROUP_SIZE, groupIdFor } from '../types';
import { getAllVocab } from './vocab';

export interface StudyCard {
  entry: VocabEntry;
  progress: ProgressRow | undefined;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function buildQueue(filter: DeckFilter, max = 200): Promise<StudyCard[]> {
  const [allVocab, allProgress] = await Promise.all([
    getAllVocab(),
    db.progress.toArray()
  ]);
  const progressById = new Map(allProgress.map(p => [p.id, p]));
  const addedIds = new Set(allProgress.filter(p => p.addedAt > 0).map(p => p.id));

  const candidates = allVocab.filter(v => {
    const prog = progressById.get(v.id);
    if (filter.hideMastered && prog?.mastered === 1) return false;
    if (filter.onlyAdded && !addedIds.has(v.id)) return false;
    if (filter.groupId != null) {
      // Group mode short-circuits other filters: study a single freq group.
      if (groupIdFor(v.freqRank) !== filter.groupId) return false;
      return true;
    }
    if (!filter.onlyAdded) {
      if (v.jlpt && !filter.jlpt.includes(v.jlpt)) return false;
      if (!v.jlpt && filter.includeFreqTop) {
        if ((v.freqRank ?? 9e9) > filter.includeFreqTop) return false;
      } else if (!v.jlpt && !addedIds.has(v.id)) {
        return false;
      }
    }
    return true;
  });

  const queue = shuffle(candidates).slice(0, max).map(entry => ({
    entry,
    progress: progressById.get(entry.id)
  }));
  return queue;
}

export async function recordOutcome(id: string, outcome: CardOutcome): Promise<void> {
  const now = Date.now();
  const existing = await db.progress.get(id);
  const next: ProgressRow = existing ?? {
    id,
    mastered: 0,
    lastSeen: 0,
    reviewCount: 0,
    knownCount: 0,
    unknownCount: 0,
    addedAt: 0
  };
  next.lastSeen = now;
  next.reviewCount += 1;
  if (outcome === 'mastered') {
    next.mastered = 1;
    next.knownCount += 1;
  } else if (outcome === 'known') {
    next.knownCount += 1;
  } else {
    next.unknownCount += 1;
    next.mastered = 0;
  }
  await db.progress.put(next);
}

export async function addWord(entry: VocabEntry): Promise<void> {
  const now = Date.now();
  const existing = await db.progress.get(entry.id);
  const next: ProgressRow = existing ?? {
    id: entry.id,
    mastered: 0,
    lastSeen: 0,
    reviewCount: 0,
    knownCount: 0,
    unknownCount: 0,
    addedAt: 0
  };
  if (!next.addedAt) next.addedAt = now;
  await db.progress.put(next);
}

export async function unmaster(id: string): Promise<void> {
  const existing = await db.progress.get(id);
  if (!existing) return;
  existing.mastered = 0;
  await db.progress.put(existing);
}

export async function progressStats(): Promise<{ mastered: number; reviewing: number; total: number }> {
  const all = await db.progress.toArray();
  let mastered = 0;
  let reviewing = 0;
  for (const p of all) {
    if (p.mastered) mastered += 1;
    else if (p.reviewCount > 0) reviewing += 1;
  }
  return { mastered, reviewing, total: all.length };
}

export interface GroupSummary {
  id: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  mastered: number;
  seen: number;
  /** N5/N4/.../mixed snapshot — useful for badge color. */
  dominantJlpt?: string;
}

export async function buildGroupSummaries(): Promise<GroupSummary[]> {
  const [allVocab, allProgress] = await Promise.all([
    getAllVocab(),
    db.progress.toArray()
  ]);
  const progressById = new Map(allProgress.map(p => [p.id, p]));
  const buckets = new Map<number, VocabEntry[]>();

  for (const v of allVocab) {
    const gid = groupIdFor(v.freqRank);
    if (!gid) continue;
    let arr = buckets.get(gid);
    if (!arr) {
      arr = [];
      buckets.set(gid, arr);
    }
    arr.push(v);
  }

  const out: GroupSummary[] = [];
  for (const [gid, entries] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    let mastered = 0;
    let seen = 0;
    const jlptCounts = new Map<string, number>();
    for (const e of entries) {
      const p = progressById.get(e.id);
      if (p?.mastered) mastered += 1;
      if (p && (p.reviewCount > 0 || p.mastered)) seen += 1;
      if (e.jlpt) jlptCounts.set(e.jlpt, (jlptCounts.get(e.jlpt) ?? 0) + 1);
    }
    let dominantJlpt: string | undefined;
    let max = 0;
    for (const [k, n] of jlptCounts) {
      if (n > max) {
        max = n;
        dominantJlpt = k;
      }
    }
    const rangeStart = (gid - 1) * GROUP_SIZE + 1;
    const rangeEnd = rangeStart + entries.length - 1;
    out.push({ id: gid, rangeStart, rangeEnd, total: entries.length, mastered, seen, dominantJlpt });
  }
  return out;
}
