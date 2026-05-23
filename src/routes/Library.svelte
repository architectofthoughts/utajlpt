<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { progressStats } from '../lib/study-engine';

  interface SongCard {
    id: string;
    title: string;
    artist: string;
    created_at: string;
    difficulty_score: number | null;
    difficulty_label: string | null;
    jlpt_distribution_json: string | null;
  }

  let songs = $state<SongCard[]>([]);
  let stats = $state<{ mastered: number; reviewing: number; total: number } | null>(null);
  let loading = $state(true);
  let songsError = $state<string | null>(null);

  function parseDistribution(raw: string | null): Record<string, number> | null {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  onMount(async () => {
    try {
      stats = await progressStats();
    } catch (e) {
      // ignore — progress is local
    }

    try {
      const res = await fetch('/api/songs');
      if (res.ok) {
        songs = await res.json();
      } else if (res.status === 401) {
        songsError = '로그인이 필요해 (가사 라이브러리는 서버 동기화).';
      } else {
        songsError = `노래 불러오기 실패: ${res.status}`;
      }
    } catch (e) {
      songsError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });
</script>

<section class="mx-auto w-full max-w-md space-y-6 px-4 pt-6">
  <header class="space-y-1">
    <h1 class="text-xl font-semibold tracking-tight">라이브러리</h1>
    <p class="text-xs text-slate-500 dark:text-slate-400">내 단어장 진도와 분석한 노래</p>
  </header>

  <!-- 회독 진도 -->
  <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400">단어장 진도</h2>
    {#if stats}
      <div class="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <div class="text-2xl font-semibold">{stats.mastered}</div>
          <div class="text-xs text-emerald-600 dark:text-emerald-400">마스터</div>
        </div>
        <div>
          <div class="text-2xl font-semibold">{stats.reviewing}</div>
          <div class="text-xs text-slate-500">회독 중</div>
        </div>
        <div>
          <div class="text-2xl font-semibold">{stats.total}</div>
          <div class="text-xs text-slate-500">전체</div>
        </div>
      </div>
    {:else}
      <p class="mt-2 text-xs text-slate-400">진도를 불러올 수 없어.</p>
    {/if}
    <div class="mt-3 flex gap-2">
      <button
        type="button"
        onclick={() => push('/list')}
        class="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
      >목록 보기</button>
      <button
        type="button"
        onclick={() => push('/stats')}
        class="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
      >통계</button>
    </div>
  </article>

  <!-- 분석한 노래 -->
  <article>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400">내 노래</h2>
      <button
        type="button"
        onclick={() => push('/lyrics')}
        class="text-xs font-medium text-sky-600 hover:text-sky-500"
      >+ 새 가사 분석</button>
    </div>

    {#if loading}
      <p class="text-xs text-slate-400">불러오는 중…</p>
    {:else if songsError}
      <p class="text-xs text-rose-500">{songsError}</p>
    {:else if songs.length === 0}
      <p class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
        아직 분석한 노래가 없어. 위 버튼으로 첫 가사를 분석해봐.
      </p>
    {:else}
      <ul class="space-y-2">
        {#each songs as song (song.id)}
          {@const dist = parseDistribution(song.jlpt_distribution_json)}
          <li>
            <button
              type="button"
              onclick={() => push(`/songs/${song.id}`)}
              class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="truncate font-medium">{song.title || '제목 없음'}</span>
                {#if song.difficulty_label}
                  <span class="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    {song.difficulty_label}
                  </span>
                {/if}
              </div>
              {#if song.artist}
                <div class="mt-0.5 truncate text-xs text-slate-500">{song.artist}</div>
              {/if}
              {#if dist}
                <div class="mt-2 flex gap-1 text-[10px]">
                  {#each Object.entries(dist) as [level, count]}
                    {#if (count as number) > 0}
                      <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {level}·{count}
                      </span>
                    {/if}
                  {/each}
                </div>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </article>
</section>
