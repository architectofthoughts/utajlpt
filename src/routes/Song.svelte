<script lang="ts">
  // 분석한 노래 상세 화면 — MVP 스텁.
  // 본격 구현(라인별 카드, 문법 해설, 단어 카드, 퀴즈)은 다음 단계.
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';

  type Params = { params?: { id?: string } };
  let { params }: Params = $props();

  interface SongDetail {
    id: string;
    title: string;
    artist: string;
    rawLyrics: string;
    lyrics: any[];
    vocab: any[];
    explanation: any[];
    difficultyScore: number | null;
    difficultyLabel: string | null;
    jlptDistribution: Record<string, number> | null;
    date: string;
  }

  let song = $state<SongDetail | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  onMount(async () => {
    const id = params?.id;
    if (!id) {
      error = '잘못된 경로야.';
      loading = false;
      return;
    }
    try {
      const res = await fetch(`/api/songs/${encodeURIComponent(id)}`);
      if (res.ok) {
        song = await res.json();
      } else if (res.status === 401) {
        error = '로그인이 필요해.';
      } else if (res.status === 404) {
        error = '이 노래를 찾을 수 없어.';
      } else {
        error = `불러오기 실패: ${res.status}`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });
</script>

<section class="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
  <button
    type="button"
    onclick={() => push('/library')}
    class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
  >← 라이브러리로</button>

  {#if loading}
    <p class="text-sm text-slate-500">불러오는 중…</p>
  {:else if error}
    <p class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>
  {:else if song}
    <header class="space-y-1">
      <h1 class="text-xl font-semibold tracking-tight font-jp">{song.title || '제목 없음'}</h1>
      {#if song.artist}<p class="text-sm text-slate-500">{song.artist}</p>{/if}
      {#if song.difficultyLabel}
        <span class="inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
          {song.difficultyLabel}
          {#if song.difficultyScore != null} · {song.difficultyScore}/100{/if}
        </span>
      {/if}
    </header>

    <article class="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
      라인별 분석 / 문법 해설 / 단어 카드 / 퀴즈 UI는 다음 단계에서 붙일게. 지금은 가사 원본만 보여줄게.
    </article>

    <article class="rounded-2xl bg-white p-4 font-jp text-sm leading-relaxed shadow-sm dark:bg-slate-800">
      <pre class="whitespace-pre-wrap break-words">{song.rawLyrics}</pre>
    </article>

    {#if song.vocab && song.vocab.length > 0}
      <article>
        <h2 class="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">핵심 단어 ({song.vocab.length})</h2>
        <ul class="space-y-1.5">
          {#each song.vocab as v}
            <li class="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800">
              <span class="font-jp font-medium">{v.term || v.kanji}</span>
              {#if v.read || v.reading}
                <span class="ml-2 text-xs text-slate-500 font-jp">{v.read || v.reading}</span>
              {/if}
              {#if v.meaning}
                <span class="ml-2 text-xs text-slate-600 dark:text-slate-300">— {v.meaning}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </article>
    {/if}
  {/if}
</section>
