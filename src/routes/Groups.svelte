<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { settings } from '../lib/stores/settings';
  import { buildGroupSummaries, type GroupSummary } from '../lib/study-engine';
  import LevelBar from '../components/LevelBar.svelte';
  import { db } from '../lib/db';

  let groups = $state<GroupSummary[]>([]);
  let masteredTotal = $state(0);
  let loading = $state(true);

  async function reload() {
    loading = true;
    const [g, p] = await Promise.all([buildGroupSummaries(), db.progress.toArray()]);
    groups = g;
    masteredTotal = p.filter(r => r.mastered === 1).length;
    loading = false;
  }

  onMount(reload);

  function startGroup(g: GroupSummary) {
    settings.update(s => ({
      ...s,
      deckFilter: { ...s.deckFilter, groupId: g.id, hideMastered: true, onlyAdded: false }
    }));
    push('/');
  }

  function clearGroupFilter() {
    settings.update(s => ({ ...s, deckFilter: { ...s.deckFilter, groupId: undefined } }));
    push('/');
  }

  function pct(g: GroupSummary): number {
    if (g.total === 0) return 0;
    return Math.round((g.mastered / g.total) * 100);
  }

  function jlptTone(j: string | undefined): string {
    switch (j) {
      case 'N5': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'N4': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
      case 'N3': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'N2': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
      case 'N1': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  }
</script>

<section class="mx-auto flex max-w-md flex-col gap-4 p-4">
  <header class="flex items-center justify-between gap-3">
    <div>
      <h1 class="text-lg font-semibold">그룹 회독</h1>
      <p class="text-xs text-slate-500">빈도 상위 200개씩 묶음 · {groups.length}그룹</p>
    </div>
    <LevelBar masteredTotal={masteredTotal} compact />
  </header>

  {#if $settings.deckFilter.groupId != null}
    <div class="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-800/50">
      <span class="text-amber-800 dark:text-amber-200">
        현재 학습: 그룹 {$settings.deckFilter.groupId}만
      </span>
      <button class="btn-ghost text-xs" onclick={clearGroupFilter}>전체로 돌아가기</button>
    </div>
  {/if}

  {#if loading}
    <div class="card-surface p-6 text-center text-sm text-slate-500">불러오는 중…</div>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each groups as g (g.id)}
        {@const ratio = pct(g)}
        {@const done = g.mastered >= g.total}
        <li>
          <button
            type="button"
            onclick={() => startGroup(g)}
            class="card-surface group flex w-full items-center gap-3 p-3 text-left transition hover:translate-x-0.5"
            class:ring-2={$settings.deckFilter.groupId === g.id}
            class:ring-amber-400={$settings.deckFilter.groupId === g.id}
          >
            <div class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-900 font-mono text-xs leading-none text-amber-300 dark:bg-slate-700">
              <span class="text-[10px] uppercase tracking-widest text-amber-500/80">grp</span>
              <span class="text-base font-bold">{g.id}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold">#{g.rangeStart}–{g.rangeEnd}</span>
                {#if g.dominantJlpt}
                  <span class="rounded-full px-1.5 py-0.5 text-[10px] {jlptTone(g.dominantJlpt)}">{g.dominantJlpt}</span>
                {/if}
                {#if done}
                  <span class="rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">CLEAR</span>
                {/if}
              </div>
              <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  class="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-[width]"
                  style="width: {ratio}%"
                ></div>
              </div>
              <div class="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{g.mastered} / {g.total} 마스터</span>
                <span>{ratio}%</span>
              </div>
            </div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
