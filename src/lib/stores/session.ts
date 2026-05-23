import { writable } from 'svelte/store';
import type { StudyCard } from '../study-engine';

export interface SessionState {
  queue: StudyCard[];
  index: number;
  flipped: boolean;
  startedAt: number;
  knownCount: number;
  unknownCount: number;
  masteredCount: number;
}

export const sessionState = writable<SessionState>({
  queue: [],
  index: 0,
  flipped: false,
  startedAt: 0,
  knownCount: 0,
  unknownCount: 0,
  masteredCount: 0
});

export function resetSession(queue: StudyCard[]): void {
  sessionState.set({
    queue,
    index: 0,
    flipped: false,
    startedAt: Date.now(),
    knownCount: 0,
    unknownCount: 0,
    masteredCount: 0
  });
}
