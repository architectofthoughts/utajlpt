// 가사 분석 + 검색 로직 — lyric의 analyzeUserLyrics / searchSongLyrics 포팅.

import { callGemini, extractText } from './gemini';

export interface LyricLine {
  jp: string;
  read: string;
  kr: string;
}

export interface VocabHit {
  term: string;
  read: string;
  meaning: string;
  description: string;
  /** Optional: matched JMdict id (added client-side after dict lookup) */
  vocabId?: string;
  jlpt?: string;
}

export interface ExplanationChapter {
  title: string;
  content: string;
}

export interface AnalysisResult {
  lyrics: LyricLine[];
  vocab: VocabHit[];
  explanation: ExplanationChapter[];
}

export interface SongInference {
  title: string;
  artist: string;
  confidence: number;
  reasoning: string;
}

export interface LrcResult {
  source: 'LRCLIB' | 'lyrics.ovh';
  title: string;
  artist: string;
  album?: string;
  lyrics: string;
  syncedLyrics?: string | null;
  duration?: number;
}

// ===== Two-stage analysis =====

const LYRICS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    lyrics: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          jp: { type: 'STRING' },
          read: { type: 'STRING' },
          kr: { type: 'STRING' }
        },
        required: ['jp', 'read', 'kr']
      }
    }
  },
  required: ['lyrics']
};

const DETAIL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    explanation: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          content: { type: 'STRING' }
        },
        required: ['title', 'content']
      }
    },
    vocab: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term: { type: 'STRING' },
          read: { type: 'STRING' },
          meaning: { type: 'STRING' },
          description: { type: 'STRING' }
        },
        required: ['term', 'read', 'meaning', 'description']
      }
    }
  },
  required: ['explanation', 'vocab']
};

export async function analyzeLineByLine(rawLyrics: string): Promise<LyricLine[]> {
  const prompt = `Please analyze the following Japanese song lyrics. For each line of the lyrics, provide the original Japanese ('jp'), the Korean pronunciation in Hangul ('read'), and the Korean translation ('kr').

Lyrics to analyze:
---
${rawLyrics}
---`;

  const res = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    {
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: LYRICS_SCHEMA
      }
    }
  );

  const parsed = JSON.parse(extractText(res));
  if (!Array.isArray(parsed.lyrics)) throw new Error('가사 분석 응답 형식이 잘못됐어.');
  return parsed.lyrics;
}

export async function analyzeDetail(lyrics: LyricLine[]): Promise<{ vocab: VocabHit[]; explanation: ExplanationChapter[] }> {
  const lyricsContext = lyrics.map(l => `${l.jp} (${l.read}) → ${l.kr}`).join('\n');

  const prompt = `You are analyzing a Japanese song. Below are the lyrics with their pronunciation and Korean translation.

=== Lyrics ===
${lyricsContext}
=== End Lyrics ===

Based on these lyrics, provide:

1. **explanation**: A detailed explanation as an array of chapter objects. Each chapter has a 'title' (chapter heading) and 'content' (the chapter body text).
   - **Persona**: Act as a kind, female Japanese teacher in her 20s or 30s. Use a friendly, conversational Korean tone (구어체).
   - **Focus (Crucial)**: The explanation's primary goal is to teach Japanese. Dedicate about 80% of the content to linguistic analysis and 20% to the song's narrative meaning.
   - **Chapters to include (4-6 chapters)**: For example:
     * 핵심 문법 포인트 - analyze grammar points (particles, conjugations, sentence patterns like ～ていく, ～のこと, ～てしまう)
     * 어휘 뉘앙스 - discuss vocabulary nuances, why certain words were chosen, emotional connotations
     * 관용 표현과 구어체 - explain idiomatic expressions, colloquial forms, and spoken Japanese patterns
     * 문장 구조와 표현 기법 - how sentence structure creates rhythm, emphasis, or emotion
     * 노래의 서사와 감정 - the song's story, emotional arc, and cultural context
     * (Add more if needed based on the lyrics)
   - Each chapter 'content' should be substantial (3-5 paragraphs of explanation).

2. **vocab**: Extract ALL meaningful vocabulary words from the lyrics (excluding particles like は/が/を/に/で/と/も/の and conjunctions like そして/でも/けど). Include every unique content word: nouns, verbs (in dictionary form), adjectives, adverbs, and meaningful expressions. Aim for at least 20 words.
   - For each word: 'term' (the word as it appears or dictionary form), 'read' (reading in hiragana), 'meaning' (Korean meaning), 'description' (detailed Korean explanation including base form, conjugation info, usage notes, and example context from the lyrics).`;

  const res = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    {
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: DETAIL_SCHEMA
      }
    }
  );

  const parsed = JSON.parse(extractText(res));
  if (!Array.isArray(parsed.vocab) || !Array.isArray(parsed.explanation)) {
    throw new Error('분석 응답 형식이 잘못됐어.');
  }
  return { vocab: parsed.vocab, explanation: parsed.explanation };
}

export async function analyzeLyrics(
  rawLyrics: string,
  onProgress?: (stage: 1 | 2, message: string) => void
): Promise<AnalysisResult> {
  onProgress?.(1, '라인별 분석 중…');
  const lyrics = await analyzeLineByLine(rawLyrics);

  onProgress?.(2, '문법·단어 해설 분석 중…');
  const { vocab, explanation } = await analyzeDetail(lyrics);

  return { lyrics, vocab, explanation };
}

// ===== Song search =====

export async function inferSongInfo(userInput: string): Promise<SongInference> {
  const prompt = `다음 사용자 입력을 바탕으로 정확한 일본어 노래 제목과 아티스트를 추론해주세요.
사용자 입력: "${userInput}"

다음 JSON 형식으로만 응답해주세요:
{
    "title": "정확한 노래 제목 (일본어)",
    "artist": "아티스트명 (일본어)",
    "confidence": 0.8,
    "reasoning": "추론 근거"
}

추론 규칙:
1. 한국어로 입력된 제목은 일본어 원제목으로 변환
2. 영어 제목인 경우 일본어 원제목 찾기
3. 아티스트가 없으면 유명한 아티스트로 추론
4. 확신도는 0.1~1.0 범위로 설정`;

  const res = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    { generationConfig: { responseMimeType: 'application/json' } }
  );

  try {
    return JSON.parse(extractText(res));
  } catch {
    return { title: userInput, artist: '', confidence: 0.3, reasoning: 'AI 파싱 실패' };
  }
}

export async function searchLrclib(title: string, artist: string): Promise<LrcResult> {
  const params = new URLSearchParams();
  if (title) params.append('track_name', title);
  if (artist) params.append('artist_name', artist);

  const url = `https://lrclib.net/api/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'utajlpt/0.1.0' }
  });

  if (!res.ok) return searchOvh(title, artist);
  const data = await res.json();
  if (!data || data.length === 0) return searchOvh(title, artist);

  const first = data[0];
  return {
    source: 'LRCLIB',
    title: first.trackName || first.name || title,
    artist: first.artistName || artist,
    album: first.albumName,
    lyrics: first.plainLyrics || first.syncedLyrics || '',
    syncedLyrics: first.syncedLyrics ?? null,
    duration: first.duration
  };
}

export async function searchOvh(title: string, artist: string): Promise<LrcResult> {
  if (!title || !artist) {
    throw new Error('lyrics.ovh는 제목과 아티스트가 모두 필요해.');
  }
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('가사를 찾을 수 없어. 다른 검색어로 시도해봐.');
  const data = await res.json();
  if (!data.lyrics) throw new Error('가사 데이터가 없어.');
  return { source: 'lyrics.ovh', title, artist, lyrics: data.lyrics, syncedLyrics: null };
}

// ===== Difficulty score =====
// JMdict 단어 매칭 + JLPT 레벨로 노래의 난이도 점수 계산.
// 60점 N5, 50점 N4, 40점 N3, 30점 N2, 20점 N1 (낮을수록 어려움).

const JLPT_BASE: Record<string, number> = { N5: 80, N4: 65, N3: 50, N2: 35, N1: 20 };

export function computeDifficulty(vocabHits: VocabHit[]): {
  score: number;
  label: string;
  distribution: Record<string, number>;
} {
  const dist: Record<string, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, none: 0 };
  let weightedSum = 0;
  let counted = 0;

  for (const v of vocabHits) {
    const level = v.jlpt;
    if (level && dist[level] !== undefined) {
      dist[level]++;
      weightedSum += JLPT_BASE[level];
      counted++;
    } else {
      dist.none++;
    }
  }

  // Unmatched JMdict 단어 비율도 난이도에 반영 (매칭 안된 게 많으면 어려움)
  const totalRated = vocabHits.length || 1;
  const matchedRatio = counted / totalRated;
  const avgWeight = counted ? weightedSum / counted : 30;
  const matchPenalty = (1 - matchedRatio) * 20;
  const score = Math.max(0, Math.min(100, Math.round(avgWeight - matchPenalty)));

  // Label by dominant level
  let dominantLevel = 'Mixed';
  let max = 0;
  for (const [lvl, n] of Object.entries(dist)) {
    if (lvl === 'none') continue;
    if (n > max) { max = n; dominantLevel = lvl; }
  }
  if (max === 0) dominantLevel = '레벨 미상';

  return { score, label: dominantLevel, distribution: dist };
}
