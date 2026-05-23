import { writable, get } from 'svelte/store';
import type { Settings } from '../../types';
import { defaultSettings } from '../../types';

const STORAGE_KEY = 'aimtotopjlpt.settings.v1';

function load(): Settings {
  if (typeof localStorage === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export const settings = writable<Settings>(load());

settings.subscribe(s => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
  applyDarkMode(s.darkMode);
});

function applyDarkMode(mode: Settings['darkMode']): void {
  if (typeof document === 'undefined') return;
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function initSettings(): void {
  applyDarkMode(get(settings).darkMode);
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      applyDarkMode(get(settings).darkMode);
    });
  }
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.update(s => ({ ...s, ...patch }));
}
