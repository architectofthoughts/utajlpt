<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { progressStats, buildGroupSummaries, type GroupSummary } from '../lib/study-engine';

  let local = $state<{ mastered: number; reviewing: number; total: number } | null>(null);
  let groups = $state<GroupSummary[]>([]);
  let serverStats = $state<any | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      [local, groups] = await Promise.all([progressStats(), buildGroupSummaries()]);
      try {
        const res = await fetch('/api/stats');
        if (res.ok) serverStats = await res.json();
      } catch {}
    } finally {
      loading = false;
    }
  });

  function pctMastered(g: GroupSummary) {
    return g.total ? Math.round((g.mastered / g.total) * 100) : 0;
  }
</script>

<section class="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
  <header class="space-y-1">
    <h1 class="text-xl font-semibold tracking-tight">통계</h1>
    <p class="text-xs text-slate-500 dark:text-slate-400">단어장 진도, 가사 분석, 스트릭</p>
  </header>

  {#if loading}
    <p class="text-sm text-slate-500">불러오는 중…</p>
  {:else}
    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400">단어 진도 (로컬)</h2>
      {#if local}
        <div class="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="text-2xl font-semibold text-emerald-600">{local.mastered}</div>
            <div class="text-[10px] text-slate-500">마스터</div>
          </div>
          <div>
            <div class="text-2xl font-semibold">{local.reviewing}</div>
            <div class="text-[10px] text-slate-500">회독 중</div>
          </div>
          <div>
            <div class="text-2xl font-semibold">{local.total}</div>
            <div class="text-[10px] text-slate-500">전체</div>
          </div>
        </div>
      {/if}
    </article>

    {#if serverStats}
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400">학습 기록 (서버)</h2>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-slate-500">현재 스트릭</span> <strong>{serverStats.currentStreak}</strong>일</div>
          <div><span class="text-slate-500">최장</span> <strong>{serverStats.longestStreak}</strong>일</div>
          <div><span class="text-slate-500">분석한 노래</span> <strong>{serverStats.totalSongsAnalyzed}</strong></div>
          <div><span class="text-slate-500">총 회독</span> <strong>{serverStats.totalReviews}</strong></div>
        </div>
      </article>
    {/if}

    <article>
      <h2 class="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">빈도 그룹별 진도</h2>
      <ul class="space-y-1.5">
        {#each groups.slice(0, 30) as g (g.id)}
          <li>
            <button
              type="button"
              onclick={() => push(`/groups`)}
              class="w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-xs hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium">#{g.id} ({g.rangeStart}–{g.rangeEnd})</span>
                <span class="text-slate-500">{g.mastered}/{g.total} · {pctMastered(g)}%</span>
              </div>
              <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div class="h-full bg-emerald-500" style="width: {pctMastered(g)}%"></div>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </article>
  {/if}
</section>
