<script lang="ts">
  import { searchVocab } from '../lib/vocab';
  import { addWord } from '../lib/study-engine';
  import { db } from '../lib/db';
  import type { ProgressRow, VocabEntry } from '../types';

  let query = $state('');
  let results = $state<VocabEntry[]>([]);
  let addedIds = $state<Set<string>>(new Set());
  let loading = $state(false);

  async function refresh() {
    loading = true;
    const [r, p] = await Promise.all([searchVocab(query, 30), db.progress.toArray()]);
    results = r;
    addedIds = new Set(p.filter((row: ProgressRow) => row.addedAt > 0).map(row => row.id));
    loading = false;
  }

  $effect(() => {
    void query;
    const t = setTimeout(refresh, 120);
    return () => clearTimeout(t);
  });

  async function add(entry: VocabEntry) {
    await addWord(entry);
    addedIds = new Set([...addedIds, entry.id]);
  }
</script>

<section class="mx-auto flex max-w-md flex-col gap-3 p-4">
  <header>
    <h1 class="text-lg font-semibold">단어 추가</h1>
    <p class="text-xs text-slate-500">JMdict + JLPT 풀에서 검색해서 내 회독에 추가해</p>
  </header>

  <input
    type="search"
    placeholder="勉強, べんきょう, study"
    bind:value={query}
    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
  />

  <ul class="flex flex-col gap-2">
    {#if loading && results.length === 0}
      <li class="p-4 text-center text-sm text-slate-400">검색 중…</li>
    {/if}
    {#each results as e (e.id)}
      <li class="card-surface flex items-center justify-between gap-3 p-3">
        <div class="min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="font-jp text-lg">{e.kanji}</span>
            <span class="font-jp text-xs text-slate-500">{e.reading}</span>
            {#if e.jlpt}<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">{e.jlpt}</span>{/if}
          </div>
          <div class="truncate text-xs text-slate-500">{e.meanings.slice(0, 3).join(', ')}</div>
        </div>
        <button
          type="button"
          onclick={() => add(e)}
          class:btn-ghost={addedIds.has(e.id)}
          class:btn-primary={!addedIds.has(e.id)}
          class="shrink-0 text-xs"
          disabled={addedIds.has(e.id)}
        >
          {addedIds.has(e.id) ? '추가됨' : '＋ 추가'}
        </button>
      </li>
    {/each}
  </ul>
</section>
