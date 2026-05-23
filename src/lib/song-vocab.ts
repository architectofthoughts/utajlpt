// song_vocab — 가사와 단어의 양방향 링크

export interface SongVocabLink {
  songId: string;
  vocabId: string;
  lineIndex: number;
  surfaceForm: string | null;
}

export interface AppearanceRow extends SongVocabLink {
  title: string;
  artist: string;
}

export async function getBySong(songId: string): Promise<SongVocabLink[]> {
  const res = await fetch(`/api/song-vocab?song=${encodeURIComponent(songId)}`);
  if (!res.ok) throw new Error(`song-vocab fetch failed: ${res.status}`);
  return res.json();
}

export async function getByVocab(vocabId: string): Promise<AppearanceRow[]> {
  const res = await fetch(`/api/song-vocab?vocab=${encodeURIComponent(vocabId)}`);
  if (!res.ok) throw new Error(`song-vocab fetch failed: ${res.status}`);
  return res.json();
}

export async function setLinks(songId: string, links: Array<{ vocabId: string; lineIndex?: number; surfaceForm?: string | null }>): Promise<void> {
  const res = await fetch('/api/song-vocab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, links })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `song-vocab save failed: ${res.status}`);
  }
}
