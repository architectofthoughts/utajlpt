<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { analyzeLyrics, inferSongInfo, searchLrclib, computeDifficulty } from '../lib/lyrics';
  import type { AnalysisResult, LrcResult, SongInference } from '../lib/lyrics';
  import { saveSong } from '../lib/songs';
  import { searchVocab } from '../lib/vocab';
  import { setLinks as setSongVocabLinks } from '../lib/song-vocab';
  import { login, checkAuth } from '../lib/auth';
  import { onMount } from 'svelte';

  let mode: 'search' | 'paste' = $state('search');
  let searchQuery = $state('');
  let pastedLyrics = $state('');
  let pastedTitle = $state('');
  let pastedArtist = $state('');

  let status = $state<'idle' | 'searching' | 'analyzing-1' | 'analyzing-2' | 'matching' | 'saving'>('idle');
  let statusMessage = $state('');
  let error = $state<string | null>(null);

  // Search step output
  let inferredSong = $state<SongInference | null>(null);
  let lrcResult = $state<LrcResult | null>(null);

  // Auth gating
  let authChecked = $state(false);
  let authed = $state(false);
  let passphrase = $state('');
  let loggingIn = $state(false);

  onMount(async () => {
    authed = await checkAuth();
    authChecked = true;
  });

  async function doLogin() {
    if (!passphrase) return;
    loggingIn = true;
    error = null;
    try {
      await login(passphrase);
      authed = true;
      passphrase = '';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loggingIn = false;
    }
  }

  async function doSearch() {
    if (!searchQuery.trim()) return;
    error = null;
    inferredSong = null;
    lrcResult = null;
    status = 'searching';
    statusMessage = '노래 정보 추론 중…';

    try {
      const info = await inferSongInfo(searchQuery);
      inferredSong = info;
      statusMessage = '가사 검색 중 (LRCLIB)…';
      const lrc = await searchLrclib(info.title, info.artist);
      lrcResult = lrc;
      // Auto-populate paste fields for direct analysis
      pastedTitle = lrc.title;
      pastedArtist = lrc.artist;
      pastedLyrics = lrc.lyrics;
      status = 'idle';
      statusMessage = '';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = 'idle';
    }
  }

  // Enrich Gemini vocab with JMdict matches (jlpt level, vocabId for linking).
  // We search by term then by reading; first match wins.
  async function enrichVocab(vocab: AnalysisResult['vocab']) {
    const enriched = await Promise.all(vocab.map(async (v) => {
      try {
        const byTerm = await searchVocab(v.term);
        const match = byTerm.find(e => e.kanji === v.term || e.reading === v.term)
          || byTerm.find(e => e.reading === v.read)
          || byTerm[0];
        if (match) {
          return { ...v, vocabId: match.id, jlpt: match.jlpt };
        }
      } catch { /* ignore */ }
      return v;
    }));
    return enriched;
  }

  async function doAnalyze() {
    if (!pastedLyrics.trim()) return;
    error = null;
    try {
      status = 'analyzing-1';
      const result = await analyzeLyrics(pastedLyrics, (stage, msg) => {
        status = stage === 1 ? 'analyzing-1' : 'analyzing-2';
        statusMessage = msg;
      });

      status = 'matching';
      statusMessage = 'JMdict 사전과 매칭 중…';
      const enrichedVocab = await enrichVocab(result.vocab);
      const difficulty = computeDifficulty(enrichedVocab);

      status = 'saving';
      statusMessage = '라이브러리에 저장 중…';
      const saved = await saveSong({
        title: pastedTitle || (inferredSong?.title ?? ''),
        artist: pastedArtist || (inferredSong?.artist ?? ''),
        rawLyrics: pastedLyrics,
        lyrics: result.lyrics,
        vocab: enrichedVocab,
        explanation: result.explanation,
        difficultyScore: difficulty.score,
        difficultyLabel: difficulty.label,
        jlptDistribution: difficulty.distribution
      });

      // Build song_vocab links — for each JMdict-matched word, find the first
      // line where its term appears, so /word/:id can jump back here.
      const links = enrichedVocab
        .filter(v => v.vocabId)
        .map(v => {
          const idx = result.lyrics.findIndex(l => l.jp.includes(v.term));
          return {
            vocabId: v.vocabId!,
            lineIndex: idx >= 0 ? idx : 0,
            surfaceForm: idx >= 0 ? v.term : null
          };
        });
      if (links.length > 0) {
        try { await setSongVocabLinks(saved.id, links); }
        catch (e) {
          // Non-fatal — song is saved, just no cross-references.
          console.warn('song-vocab link save failed:', e);
        }
      }

      // Done — navigate to song detail
      push(`/songs/${saved.id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = 'idle';
    }
  }

  const busy = $derived(status !== 'idle');
</script>

<section class="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
  <header class="space-y-1">
    <h1 class="text-xl font-semibold tracking-tight">가사 분석</h1>
    <p class="text-xs text-slate-500 dark:text-slate-400">노래 가사를 AI로 분석해 단어와 문법을 풀어봐.</p>
  </header>

  {#if authChecked && !authed}
    <article class="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
      <h2 class="text-sm font-medium text-amber-800 dark:text-amber-200">로그인이 필요해</h2>
      <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
        가사 분석은 서버 Gemini 프록시를 거쳐서 진행돼. passphrase로 로그인해줘.
      </p>
      <div class="mt-3 flex gap-2">
        <input
          type="password"
          bind:value={passphrase}
          placeholder="passphrase"
          class="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm dark:border-amber-600 dark:bg-slate-800"
        />
        <button
          type="button"
          onclick={doLogin}
          disabled={loggingIn || !passphrase}
          class="btn btn-primary disabled:opacity-50"
        >{loggingIn ? '...' : '로그인'}</button>
      </div>
      {#if error}<p class="mt-2 text-xs text-rose-600">{error}</p>{/if}
    </article>
  {:else if authChecked}
    <!-- Mode toggle -->
    <div class="flex rounded-xl bg-slate-100 p-1 text-sm dark:bg-slate-800">
      <button
        type="button"
        onclick={() => (mode = 'search')}
        class="flex-1 rounded-lg py-1.5 transition"
        class:bg-white={mode === 'search'}
        class:dark:bg-slate-700={mode === 'search'}
        class:shadow-sm={mode === 'search'}
      >🔍 검색</button>
      <button
        type="button"
        onclick={() => (mode = 'paste')}
        class="flex-1 rounded-lg py-1.5 transition"
        class:bg-white={mode === 'paste'}
        class:dark:bg-slate-700={mode === 'paste'}
        class:shadow-sm={mode === 'paste'}
      >✏️ 붙여넣기</button>
    </div>

    {#if mode === 'search'}
      <div class="space-y-2">
        <label for="lyrics-search" class="text-xs font-medium text-slate-500 dark:text-slate-400">
          노래 제목 / 아티스트
        </label>
        <input
          id="lyrics-search"
          type="text"
          bind:value={searchQuery}
          placeholder="예: 레몬 米津玄師, 우주를 달린다"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800"
          disabled={busy}
        />
        <button
          type="button"
          onclick={doSearch}
          disabled={!searchQuery.trim() || busy}
          class="btn btn-primary w-full disabled:opacity-50"
        >가사 검색</button>
      </div>

      {#if inferredSong && lrcResult}
        <article class="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-800 dark:bg-sky-900/30">
          <div class="font-medium text-sky-900 dark:text-sky-200">
            🎵 {lrcResult.title} — {lrcResult.artist}
            <span class="ml-1 text-[10px] opacity-70">[{lrcResult.source}]</span>
          </div>
          {#if inferredSong.reasoning}
            <p class="mt-1 text-sky-700 dark:text-sky-300">{inferredSong.reasoning}</p>
          {/if}
          <p class="mt-2 text-sky-600 dark:text-sky-300">아래 가사를 확인하고 "분석하기"를 눌러줘.</p>
        </article>
      {/if}
    {/if}

    <!-- Lyrics editor (shared by both modes) -->
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <input
          type="text"
          bind:value={pastedTitle}
          placeholder="제목"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          disabled={busy}
        />
        <input
          type="text"
          bind:value={pastedArtist}
          placeholder="아티스트"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          disabled={busy}
        />
      </div>
      <textarea
        bind:value={pastedLyrics}
        rows="12"
        placeholder="가사를 여기에 붙여넣거나 위 검색 결과를 사용해줘"
        class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-jp dark:border-slate-600 dark:bg-slate-800"
        disabled={busy}
      ></textarea>
      <button
        type="button"
        onclick={doAnalyze}
        disabled={!pastedLyrics.trim() || busy}
        class="btn btn-primary w-full disabled:opacity-50"
      >{busy ? '분석 중…' : '분석하기'}</button>
    </div>

    {#if busy}
      <article class="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        ⏳ {statusMessage}
      </article>
    {/if}

    {#if error}
      <article class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
        {error}
      </article>
    {/if}
  {/if}
</section>
