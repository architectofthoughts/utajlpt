<script lang="ts">
  import { settings, updateSettings } from '../lib/stores/settings';
  import { hardReset } from '../lib/vocab';
  import type { JlptLevel } from '../types';

  const levels: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

  let resetting = $state(false);

  function toggleLevel(l: JlptLevel) {
    settings.update(s => {
      const has = s.deckFilter.jlpt.includes(l);
      const next = has ? s.deckFilter.jlpt.filter(x => x !== l) : [...s.deckFilter.jlpt, l];
      return { ...s, deckFilter: { ...s.deckFilter, jlpt: next } };
    });
  }

  async function refreshData() {
    if (resetting) return;
    if (!confirm('서버에서 단어 데이터를 다시 받고 캐시를 비울게.\n진도(마스터/회독중)는 함께 사라져. 계속할까?')) return;
    resetting = true;
    await hardReset();
  }
</script>

<section class="mx-auto flex max-w-md flex-col gap-6 p-4">
  <header>
    <h1 class="text-lg font-semibold">설정</h1>
  </header>

  <div class="card-surface flex flex-col gap-3 p-4">
    <h2 class="text-sm font-semibold">오토 모드</h2>
    <label class="flex items-center justify-between text-sm">
      <span>자동 다음 카드</span>
      <input
        type="checkbox"
        checked={$settings.autoMode}
        onchange={(e) => updateSettings({ autoMode: (e.currentTarget as HTMLInputElement).checked })}
      />
    </label>
    <label class="flex items-center justify-between text-sm">
      <span>대기 시간 ({$settings.autoSeconds}초)</span>
      <input
        type="range"
        min="2"
        max="20"
        value={$settings.autoSeconds}
        onchange={(e) => updateSettings({ autoSeconds: Number((e.currentTarget as HTMLInputElement).value) })}
      />
    </label>
    <p class="text-xs text-slate-500">
      이 시간 안에 "모르겠어"를 누르지 않으면 자동으로 "알겠어"로 처리돼.
    </p>
  </div>

  <div class="card-surface flex flex-col gap-3 p-4">
    <h2 class="text-sm font-semibold">학습 범위</h2>
    <div class="flex flex-wrap gap-2 text-xs">
      {#each levels as l}
        <button
          type="button"
          onclick={() => toggleLevel(l)}
          class="rounded-full border px-3 py-1"
          class:border-slate-900={$settings.deckFilter.jlpt.includes(l)}
          class:dark:border-white={$settings.deckFilter.jlpt.includes(l)}
          class:border-slate-200={!$settings.deckFilter.jlpt.includes(l)}
          class:dark:border-slate-700={!$settings.deckFilter.jlpt.includes(l)}
        >{l}</button>
      {/each}
    </div>
    <label class="flex items-center justify-between text-sm">
      <span>마스터한 단어 숨김</span>
      <input
        type="checkbox"
        checked={$settings.deckFilter.hideMastered}
        onchange={(e) =>
          updateSettings({
            deckFilter: { ...$settings.deckFilter, hideMastered: (e.currentTarget as HTMLInputElement).checked }
          })}
      />
    </label>
    <label class="flex items-center justify-between text-sm">
      <span>내가 추가한 단어만</span>
      <input
        type="checkbox"
        checked={$settings.deckFilter.onlyAdded}
        onchange={(e) =>
          updateSettings({
            deckFilter: { ...$settings.deckFilter, onlyAdded: (e.currentTarget as HTMLInputElement).checked }
          })}
      />
    </label>
  </div>

  <div class="card-surface flex flex-col gap-3 p-4">
    <h2 class="text-sm font-semibold">테마</h2>
    <div class="flex gap-2 text-xs">
      {#each ['system', 'light', 'dark'] as m}
        <button
          type="button"
          onclick={() => updateSettings({ darkMode: m as 'system' | 'light' | 'dark' })}
          class="rounded-full border px-3 py-1"
          class:border-slate-900={$settings.darkMode === m}
          class:dark:border-white={$settings.darkMode === m}
          class:border-slate-200={$settings.darkMode !== m}
          class:dark:border-slate-700={$settings.darkMode !== m}
        >{m}</button>
      {/each}
    </div>
  </div>

  <div class="card-surface flex flex-col gap-3 p-4 opacity-60">
    <h2 class="text-sm font-semibold">기기 동기화 (예정)</h2>
    <p class="text-xs text-slate-500">
      6자리 핀으로 다른 기기와 같은 진도를 공유하는 기능. D1 + Worker 페이로드 연결 후 활성화.
    </p>
    <button class="btn-ghost cursor-not-allowed text-xs" disabled>핀 발급 (미구현)</button>
  </div>

  <div class="card-surface flex flex-col gap-3 p-4">
    <h2 class="text-sm font-semibold text-rose-700 dark:text-rose-300">데이터 새로고침</h2>
    <p class="text-xs text-slate-500">
      서버에서 최신 단어 데이터를 다시 받고 서비스워커 캐시를 모두 비워. 학습 진도(마스터·회독중)도 같이 초기화돼.
    </p>
    <button
      type="button"
      onclick={refreshData}
      disabled={resetting}
      class="btn-ghost border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/20"
    >
      {resetting ? '초기화 중…' : '🗘 캐시 비우고 다시 받기'}
    </button>
  </div>
</section>
