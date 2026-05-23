export type JlptLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export interface VocabEntry {
  /** Stable id — `${kanji}|${reading}` or JMdict ent_seq when available. */
  id: string;
  kanji: string;
  reading: string;
  meanings: string[];
  pos?: string[];
  jlpt?: JlptLevel;
  /** Lower = more frequent. */
  freqRank?: number;
  tags?: string[];
}

export type CardOutcome = 'known' | 'unknown' | 'mastered';

export interface ProgressRow {
  id: string;
  mastered: 0 | 1;
  lastSeen: number;
  reviewCount: number;
  knownCount: number;
  unknownCount: number;
  addedAt: number;
}

export interface Settings {
  autoMode: boolean;
  autoSeconds: number;
  darkMode: 'system' | 'light' | 'dark';
  voiceEnabled: boolean;
  deckFilter: DeckFilter;
  pinDeviceId: string | null;
}

export interface DeckFilter {
  jlpt: JlptLevel[];
  includeFreqTop?: number;
  /** When set, the queue is restricted to this frequency group (200 words / group). */
  groupId?: number;
  onlyAdded: boolean;
  hideMastered: boolean;
}

export const defaultDeckFilter: DeckFilter = {
  jlpt: ['N5', 'N4', 'N3', 'N2', 'N1'],
  onlyAdded: false,
  hideMastered: true
};

export const GROUP_SIZE = 200;

export function groupIdFor(freqRank: number | undefined): number | undefined {
  if (!freqRank || freqRank <= 0) return undefined;
  return Math.floor((freqRank - 1) / GROUP_SIZE) + 1;
}

export function groupRange(groupId: number): [number, number] {
  const start = (groupId - 1) * GROUP_SIZE + 1;
  return [start, start + GROUP_SIZE - 1];
}

export const defaultSettings: Settings = {
  autoMode: false,
  autoSeconds: 5,
  darkMode: 'system',
  voiceEnabled: true,
  deckFilter: defaultDeckFilter,
  pinDeviceId: null
};
