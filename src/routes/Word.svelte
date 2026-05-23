<script lang="ts">
  // 단어 상세 + 이 단어가 등장한 노래 리스트
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { searchVocab } from '../lib/vocab';
  import { db } from '../lib/db';
  import type { VocabEntry, ProgressRow } from '../types';

  type Params = { params?: { id?: string } };
  let { params }: Params = $props();

  let entry = $state<VocabEntry | null>(null);
  let progress = $state<ProgressRow | null>(null);
  let appearances = $state<Array<{ songId: string; title: string; artist: string; lineIndex: number; surfaceForm: string | null }>>([]);
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
      // Lookup vocab entry (using existing search infrastructure)
      const all = await searchVocab('');
      entry = all.find(e => e.id === id) || null;

      // Local progress
      const prow = await db.progress.get(id);
      progress = prow || null;

      // Server: which songs this word appears in
      try {
        const res = await fetch(`/api/song-vocab?vocab=${encodeURIComponent(id)}`);
        if (res.ok) {
          appearances = await res.json();
        }
      } catch { /* server optional */ }
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
    onclick={() => history.back()}
    class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
  >← 뒤로</button>

  {#if loading}
    <p class="text-sm text-slate-500">불러오는 중…</p>
  {:else if error}
    <p class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>
  {:else if entry}
    <header class="space-y-2 rounded-2xl bg-white p-5 text-center shadow-sm dark:bg-slate-800">
      <div class="font-jp text-4xl font-medium">{entry.kanji}</div>
      <div class="font-jp text-base text-slate-500">{entry.reading}</div>
      <div class="text-sm text-slate-700 dark:text-slate-300">{entry.meanings.join(' · ')}</div>
      <div class="mt-2 flex justify-center gap-2 text-[10px]">
        {#if entry.jlpt}
          <span class="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{entry.jlpt}</span>
        {/if}
        {#if entry.freqRank}
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">빈도 {entry.freqRank}</span>
        {/if}
        {#if progress?.mastered}
          <span class="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">✓ 마스터</span>
        {/if}
      </div>
    </header>

    {#if appearances.length > 0}
      <article>
        <h2 class="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">이 단어가 나온 노래 ({appearances.length})</h2>
        <ul class="space-y-1.5">
          {#each appearances as ap (ap.songId + ap.lineIndex)}
            <li>
              <button
                type="button"
                onclick={() => push(`/songs/${ap.songId}`)}
                class="w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                <span class="font-medium">{ap.title || '제목 없음'}</span>
                {#if ap.artist}<span class="ml-1 text-xs text-slate-500">— {ap.artist}</span>{/if}
                {#if ap.surfaceForm}
                  <div class="mt-0.5 text-xs text-slate-400 font-jp">"{ap.surfaceForm}"</div>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </article>
    {:else}
      <p class="text-xs text-slate-400">아직 이 단어가 나온 노래가 없어.</p>
    {/if}
  {:else}
    <p class="text-sm text-slate-500">단어를 찾을 수 없어.</p>
  {/if}
</section>
