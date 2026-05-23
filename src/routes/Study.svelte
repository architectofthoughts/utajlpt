<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { push } from 'svelte-spa-router';
  import Card from '../components/Card.svelte';
  import AutoTimer from '../components/AutoTimer.svelte';
  import LevelBar from '../components/LevelBar.svelte';
  import { settings } from '../lib/stores/settings';
  import { sessionState, resetSession } from '../lib/stores/session';
  import { buildQueue, recordOutcome, progressStats } from '../lib/study-engine';
  import { db } from '../lib/db';
  import type { CardOutcome } from '../types';

  let stats = $state({ mastered: 0, reviewing: 0, total: 0 });
  let masteredTotal = $state(0);
  let timerProgress = $state(0);
  let timerHandle: number | null = null;
  let timerStartedAt = 0;

  async function refreshStats() {
    stats = await progressStats();
    const all = await db.progress.toArray();
    masteredTotal = all.filter(p => p.mastered === 1).length;
  }

  async function startSession() {
    const filter = get(settings).deckFilter;
    const queue = await buildQueue(filter);
    resetSession(queue);
    await refreshStats();
    if (get(settings).autoMode) startTimer();
  }

  function startTimer() {
    stopTimer();
    if (!get(settings).autoMode) return;
    timerStartedAt = performance.now();
    timerProgress = 0;
    const tick = () => {
      const seconds = get(settings).autoSeconds;
      const elapsed = (performance.now() - timerStartedAt) / 1000;
      timerProgress = Math.min(elapsed / seconds, 1);
      if (timerProgress >= 1) {
        handleOutcome('known');
        return;
      }
      timerHandle = requestAnimationFrame(tick);
    };
    timerHandle = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (timerHandle != null) cancelAnimationFrame(timerHandle);
    timerHandle = null;
    timerProgress = 0;
  }

  function flip() {
    sessionState.update(s => ({ ...s, flipped: !s.flipped }));
  }

  async function handleOutcome(outcome: CardOutcome) {
    stopTimer();
    const s = get(sessionState);
    const card = s.queue[s.index];
    if (!card) return;
    await recordOutcome(card.entry.id, outcome);
    sessionState.update(prev => ({
      ...prev,
      index: prev.index + 1,
      flipped: false,
      knownCount: prev.knownCount + (outcome === 'known' || outcome === 'mastered' ? 1 : 0),
      unknownCount: prev.unknownCount + (outcome === 'unknown' ? 1 : 0),
      masteredCount: prev.masteredCount + (outcome === 'mastered' ? 1 : 0)
    }));
    await refreshStats();
    if (get(sessionState).index >= s.queue.length) {
      stopTimer();
      return;
    }
    if (get(settings).autoMode) startTimer();
  }

  onMount(startSession);
  onDestroy(stopTimer);

  let lastAuto = $state(false);
  $effect(() => {
    const auto = $settings.autoMode;
    if (auto !== lastAuto) {
      lastAuto = auto;
      if (auto) startTimer();
      else stopTimer();
    }
  });

  let current = $derived($sessionState.queue[$sessionState.index]);
  let done = $derived($sessionState.queue.length > 0 && $sessionState.index >= $sessionState.queue.length);
  let remaining = $derived($sessionState.queue.length - $sessionState.index);
  let groupId = $derived($settings.deckFilter.groupId);

  function clearGroup() {
    settings.update(s => ({ ...s, deckFilter: { ...s.deckFilter, groupId: undefined } }));
    startSession();
  }
</script>

<section class="mx-auto flex h-full max-w-md flex-col gap-3 p-3">
  <header class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold">학습</h1>
        {#if groupId != null}
          <button
            type="button"
            onclick={clearGroup}
            class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700"
            title="그룹 필터 해제"
          >
            그룹 {groupId} ×
          </button>
        {/if}
      </div>
      <p class="text-[11px] text-slate-500">
        마스터 {stats.mastered} · 회독중 {stats.reviewing} · 큐 {remaining}장
      </p>
    </div>
    <LevelBar masteredTotal={masteredTotal} compact />
  </header>

  <div class="flex items-center gap-2">
    <AutoTimer progress={timerProgress} active={$settings.autoMode && !done} />
    <button
      type="button"
      onclick={() => settings.update(s => ({ ...s, autoMode: !s.autoMode }))}
      class="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium dark:border-slate-600"
      class:bg-slate-900={$settings.autoMode}
      class:text-white={$settings.autoMode}
      class:dark:bg-white={$settings.autoMode}
      class:dark:text-slate-900={$settings.autoMode}
    >
      {$settings.autoMode ? `⏸ 오토 ${$settings.autoSeconds}s` : '▶ 오토'}
    </button>
  </div>

  <div class="flex flex-1 flex-col gap-3 min-h-0">
    {#if done}
      <div class="card-surface flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div class="text-5xl">🐰</div>
        <h2 class="text-xl font-semibold">한 바퀴 끝!</h2>
        <p class="text-sm text-slate-500">
          알겠어 {$sessionState.knownCount} · 모르겠어 {$sessionState.unknownCount} · 마스터 {$sessionState.masteredCount}
        </p>
        <div class="flex gap-2 pt-2">
          <button class="btn-primary" onclick={startSession}>다시 회독</button>
          <button class="btn-ghost" onclick={() => push('/groups')}>그룹 보기</button>
        </div>
      </div>
    {:else if current}
      <Card entry={current.entry} flipped={$sessionState.flipped} onflip={flip} />

      <div class="grid grid-cols-3 gap-2">
        <button
          onclick={() => handleOutcome('unknown')}
          class="group relative flex h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-rose-500/10 ring-1 ring-inset ring-rose-300 transition active:scale-[0.97] active:bg-rose-500/20 dark:ring-rose-900/50 sm:h-32"
        >
          <span class="text-3xl text-rose-500" aria-hidden="true">❌</span>
          <span class="text-base font-semibold text-rose-700 dark:text-rose-300">모르겠어</span>
          <span class="absolute bottom-1.5 text-[10px] uppercase tracking-wider text-rose-400">again</span>
        </button>

        <button
          onclick={() => handleOutcome('known')}
          class="group relative flex h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-900 text-white shadow-sm transition active:scale-[0.97] active:bg-slate-800 dark:bg-white dark:text-slate-900 sm:h-32"
        >
          <span class="text-3xl" aria-hidden="true">⭕</span>
          <span class="text-base font-semibold">알겠어</span>
          <span class="absolute bottom-1.5 text-[10px] uppercase tracking-wider opacity-60">good</span>
        </button>

        <button
          onclick={() => handleOutcome('mastered')}
          class="group relative flex h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500/10 ring-1 ring-inset ring-emerald-300 transition active:scale-[0.97] active:bg-emerald-500/20 dark:ring-emerald-900/50 sm:h-32"
        >
          <span class="text-3xl text-emerald-500" aria-hidden="true">✓</span>
          <span class="text-base font-semibold text-emerald-700 dark:text-emerald-300">마스터</span>
          <span class="absolute bottom-1.5 text-[10px] uppercase tracking-wider text-emerald-400">forever</span>
        </button>
      </div>
      <p class="text-center text-[10px] text-slate-400">
        오토 모드 {$settings.autoSeconds}초 안에 "모르겠어"를 누르지 않으면 자동으로 "알겠어"로 넘어가
      </p>
    {:else}
      <div class="card-surface flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500">
        <p>학습할 단어가 없어.</p>
        <button class="btn-primary" onclick={() => push('/groups')}>그룹에서 시작</button>
      </div>
    {/if}
  </div>
</section>
