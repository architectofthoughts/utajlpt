<script lang="ts">
  // 가사 입력/검색/분석 진입 — MVP 스텁.
  // 본격 구현(LRCLIB 검색, Gemini 분석 콜, 결과 미리보기)은 다음 단계.
  import { push } from 'svelte-spa-router';

  let mode: 'search' | 'paste' = $state('search');
  let searchQuery = $state('');
  let pastedLyrics = $state('');
  let pastedTitle = $state('');
  let pastedArtist = $state('');
  let status = $state<'idle' | 'analyzing'>('idle');
  let error = $state<string | null>(null);

  async function analyze() {
    error = '아직 분석 기능은 다음 단계에서 붙일게. 지금은 라우트만 잡힌 상태야 🐰';
  }

  async function search() {
    error = '가사 자동 검색(LRCLIB)도 다음 단계.';
  }
</script>

<section class="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
  <header class="space-y-1">
    <h1 class="text-xl font-semibold tracking-tight">가사 분석</h1>
    <p class="text-xs text-slate-500 dark:text-slate-400">노래 가사를 AI로 분석해 단어와 문법을 풀어봐.</p>
  </header>

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
      />
      <button
        type="button"
        onclick={search}
        disabled={!searchQuery.trim() || status !== 'idle'}
        class="btn btn-primary w-full"
      >가사 검색</button>
    </div>
  {:else}
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <input
          type="text"
          bind:value={pastedTitle}
          placeholder="제목 (선택)"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <input
          type="text"
          bind:value={pastedArtist}
          placeholder="아티스트 (선택)"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </div>
      <textarea
        bind:value={pastedLyrics}
        rows="10"
        placeholder="가사를 여기에 붙여넣어줘"
        class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-jp dark:border-slate-600 dark:bg-slate-800"
      ></textarea>
      <button
        type="button"
        onclick={analyze}
        disabled={!pastedLyrics.trim() || status !== 'idle'}
        class="btn btn-primary w-full"
      >분석하기</button>
    </div>
  {/if}

  {#if error}
    <p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      {error}
    </p>
  {/if}
</section>
