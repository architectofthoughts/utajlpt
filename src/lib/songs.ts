// Song library API client (/api/songs)

import type { AnalysisResult } from './lyrics';

export interface SongListItem {
  id: string;
  title: string;
  artist: string;
  created_at: string;
  difficulty_score: number | null;
  difficulty_label: string | null;
  jlpt_distribution_json: string | null;
}

export interface SongDetail {
  id: string;
  title: string;
  artist: string;
  rawLyrics: string;
  lyrics: AnalysisResult['lyrics'];
  vocab: AnalysisResult['vocab'];
  explanation: AnalysisResult['explanation'];
  difficultyScore: number | null;
  difficultyLabel: string | null;
  jlptDistribution: Record<string, number> | null;
  date: string;
}

export interface SaveSongInput {
  title: string;
  artist: string;
  rawLyrics: string;
  lyrics: AnalysisResult['lyrics'];
  vocab: AnalysisResult['vocab'];
  explanation: AnalysisResult['explanation'];
  difficultyScore: number | null;
  difficultyLabel: string | null;
  jlptDistribution: Record<string, number> | null;
}

export async function listSongs(): Promise<SongListItem[]> {
  const res = await fetch('/api/songs');
  if (!res.ok) throw new Error(`목록 실패: ${res.status}`);
  return res.json();
}

export async function getSong(id: string): Promise<SongDetail> {
  const res = await fetch(`/api/songs/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new Error('노래를 찾을 수 없어.');
  if (!res.ok) throw new Error(`불러오기 실패: ${res.status}`);
  return res.json();
}

export async function saveSong(input: SaveSongInput): Promise<{ id: string; created?: boolean; updated?: boolean }> {
  const res = await fetch('/api/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `저장 실패: ${res.status}`);
  }
  return res.json();
}

export async function deleteSong(id: string): Promise<void> {
  const res = await fetch(`/api/songs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`삭제 실패: ${res.status}`);
}
