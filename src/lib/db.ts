import Dexie, { type Table } from 'dexie';
import type { ProgressRow, VocabEntry } from '../types';

export interface VocabCacheRow extends VocabEntry {}

class AimDB extends Dexie {
  vocab!: Table<VocabCacheRow, string>;
  progress!: Table<ProgressRow, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('aimtotopjlpt');
    this.version(1).stores({
      vocab: 'id, kanji, reading, jlpt, freqRank',
      progress: 'id, mastered, lastSeen, reviewCount, addedAt',
      meta: 'key'
    });
  }
}

export const db = new AimDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
