// Mastery → level/XP curve.
//
// Cheap, satisfying, MUD-retro style: "every N mastered words = next level",
// where N grows slowly so early levels feel snappy and later levels feel earned.
//
//   level 1 → level 2:  20 mastered
//   level 2 → level 3:  25
//   level 3 → level 4:  30
//   ...
//   level n → level n+1: 20 + (n-1) * 5

export interface LevelInfo {
  level: number;
  /** Mastered words counted toward the *current* level (0..need). */
  current: number;
  /** Mastered words needed to *complete* the current level. */
  need: number;
  /** Total mastered words across all levels. */
  total: number;
}

function needForLevel(level: number): number {
  return 20 + (level - 1) * 5;
}

export function computeLevel(masteredTotal: number): LevelInfo {
  let level = 1;
  let remaining = masteredTotal;
  while (true) {
    const need = needForLevel(level);
    if (remaining < need) {
      return { level, current: remaining, need, total: masteredTotal };
    }
    remaining -= need;
    level += 1;
  }
}

/** Render an ASCII bar like `▓▓▓▓░░░░░░` for the MUD-retro vibe. */
export function asciiBar(current: number, need: number, width = 14): string {
  const ratio = need <= 0 ? 0 : Math.min(1, current / need);
  const filled = Math.round(ratio * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
}
