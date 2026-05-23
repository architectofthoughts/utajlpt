<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import { getAllVocab } from '../lib/vocab';
  import { unmaster } from '../lib/study-engine';
  import type { JlptLevel, ProgressRow, VocabEntry } from '../types';

  let entries = $state<VocabEntry[]>([]);
  let progressMap = $state<Map<string, ProgressRow>>(new Map());
  let query = $state('');
  let levelFilter = $state<JlptLevel | 'ALL' | 'MASTERED' | 'ADDED'>('ALL');

  async function reload() {
    const [v, p] = await Promise.all([getAllVocab(), db.progress.toArray()]);
    entries = v;
    progressMap = new Map(p.map(r => [r.id, r]));
  }

  onMount(reload);

  let filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter(e => {
        if (levelFilter === 'MASTERED') return progressMap.get(e.id)?.mastered === 1;
        if (levelFilter === 'ADDED') return (progressMap.get(e.id)?.addedAt ?? 0) > 0;
        if (levelFilter !== 'ALL') return e.jlpt === levelFilter;
        return true;
      })
      .filter(e => {
        if (!q) return true;
        return (
          e.kanji.includes(query) ||
          e.reading.includes(query) ||
          e.meanings.join(' ').toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  });

  async function toggleMaster(id: string) {
    const row = progressMap.get(id);
    if (row?.mastered) {
      await unmaster(id);
    } else {
      const next: ProgressRow = row ?? {
        id,
        mastered: 0,
        lastSeen: 0,
        reviewCount: 0,
        knownCount: 0,
        unknownCount: 0,
        addedAt: 0
      };
      next.mastered = 1;
      await db.progress.put(next);
    }
    await reload();
  }
</script>

<section class="mx-auto flex max-w-md flex-col gap-3 p-4">
  <header>
    <h1 class="text-lg font-semibold">목록</h1>
    <p class="text-xs text-slate-500">총 {entries.length}개 단어 · 표시 {filtered.length}개</p>
  </header>

  <input
    type="search"
    placeholder="한자, 요미카타, 영어 뜻으로 검색"
    bind:value={query}
    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
  />

  <div class="flex flex-wrap gap-1 text-xs">
    {#each ['ALL','N5','N4','N3','N2','N1','ADDED','MASTERED'] as f}
      <button
        type="button"
        onclick={() => (levelFilter = f as typeof levelFilter)}
        class="rounded-full border px-3 py-1 transition"
        class:border-slate-900={levelFilter === f}
        class:dark:border-white={levelFilter === f}
        class:border-slate-200={levelFilter !== f}
        class:dark:border-slate-700={levelFilter !== f}
      >{f}</button>
    {/each}
  </div>

  <ul class="flex flex-col gap-2">
    {#each filtered as e (e.id)}
      {@const p = progressMap.get(e.id)}
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
          onclick={() => toggleMaster(e.id)}
          class="btn-ghost shrink-0 text-xs"
          title={p?.mastered ? '마스터 해제' : '마스터 표시'}
        >
          {p?.mastered ? '✓ 마스터' : '○'}
        </button>
      </li>
    {:else}
      <li class="p-8 text-center text-sm text-slate-400">결과 없음</li>
    {/each}
  </ul>
</section>
