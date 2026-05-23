<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { getSong, deleteSong } from '../lib/songs';
  import type { SongDetail } from '../lib/songs';
  import type { LyricLine, VocabHit } from '../lib/lyrics';

  type Params = { params?: { id?: string } };
  let { params }: Params = $props();

  let song = $state<SongDetail | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  let tab: 'lyrics' | 'explanation' | 'vocab' | 'quiz' = $state('lyrics');

  // Lyric line interaction
  let revealedLines = $state<Set<number>>(new Set());
  function toggleLine(i: number) {
    const next = new Set(revealedLines);
    next.has(i) ? next.delete(i) : next.add(i);
    revealedLines = next;
  }
  function revealAll() {
    if (!song) return;
    revealedLines = new Set(song.lyrics.map((_, i) => i));
  }
  function hideAll() {
    revealedLines = new Set();
  }

  // Explanation chapter expand
  let openChapters = $state<Set<number>>(new Set([0]));
  function toggleChapter(i: number) {
    const next = new Set(openChapters);
    next.has(i) ? next.delete(i) : next.add(i);
    openChapters = next;
  }

  onMount(async () => {
    const id = params?.id;
    if (!id) { error = '잘못된 경로야.'; loading = false; return; }
    try {
      song = await getSong(id);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });

  async function handleDelete() {
    if (!song) return;
    if (!confirm(`"${song.title}"을(를) 삭제할까?`)) return;
    try {
      await deleteSong(song.id);
      push('/library');
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  // === Quiz ===
  type QuizType = 'pronunciation' | 'fill' | 'translation';
  type QuizState = {
    type: QuizType;
    question: string;
    options: string[];
    correct: string;
    selected: string | null;
    isCorrect: boolean | null;
  };

  let quiz = $state<QuizState | null>(null);

  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildPronunciation(lines: LyricLine[]): QuizState | null {
    if (lines.length < 4) return null;
    const target = lines[Math.floor(Math.random() * lines.length)];
    const opts = new Set([target.read]);
    while (opts.size < 4) opts.add(lines[Math.floor(Math.random() * lines.length)].read);
    return { type: 'pronunciation', question: target.jp, options: shuffle([...opts]), correct: target.read, selected: null, isCorrect: null };
  }

  function buildFill(lines: LyricLine[], vocab: VocabHit[]): QuizState | null {
    if (vocab.length < 4) return null;
    // Find a line that contains some vocab term
    const candidates = vocab.filter(v => lines.some(l => l.jp.includes(v.term)));
    if (candidates.length === 0) return null;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const line = lines.find(l => l.jp.includes(target.term));
    if (!line) return null;
    const blanked = line.jp.replace(target.term, '[ ____ ]');
    const opts = new Set([target.term]);
    while (opts.size < 4) {
      const v = vocab[Math.floor(Math.random() * vocab.length)];
      opts.add(v.term);
    }
    return { type: 'fill', question: blanked, options: shuffle([...opts]), correct: target.term, selected: null, isCorrect: null };
  }

  function buildTranslation(lines: LyricLine[]): QuizState | null {
    if (lines.length < 4) return null;
    const target = lines[Math.floor(Math.random() * lines.length)];
    const opts = new Set([target.kr]);
    while (opts.size < 4) opts.add(lines[Math.floor(Math.random() * lines.length)].kr);
    return { type: 'translation', question: target.jp, options: shuffle([...opts]), correct: target.kr, selected: null, isCorrect: null };
  }

  function newQuiz() {
    if (!song || song.lyrics.length === 0) {
      quiz = null;
      return;
    }
    const builders = [
      () => buildPronunciation(song!.lyrics),
      () => buildFill(song!.lyrics, song!.vocab),
      () => buildTranslation(song!.lyrics)
    ];
    // Try random orders until one builds
    for (const b of shuffle(builders)) {
      const q = b();
      if (q) { quiz = q; return; }
    }
    quiz = null;
  }

  function answer(opt: string) {
    if (!quiz || quiz.selected != null) return;
    const next = { ...quiz, selected: opt, isCorrect: opt.trim() === quiz.correct.trim() };
    quiz = next;
  }

  $effect(() => {
    if (tab === 'quiz' && song && !quiz) {
      newQuiz();
    }
  });

  const quizTypeLabel: Record<QuizType, string> = {
    pronunciation: '독음',
    fill: '빈칸',
    translation: '번역'
  };
</script>

<section class="mx-auto w-full max-w-md space-y-4 px-4 pt-6">
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
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-lg font-semibold tracking-tight font-jp">{song.title || '제목 없음'}</h1>
          {#if song.artist}<p class="truncate text-sm text-slate-500">{song.artist}</p>{/if}
        </div>
        <button
          type="button"
          onclick={handleDelete}
          class="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
        >삭제</button>
      </div>
      {#if song.difficultyLabel || song.difficultyScore != null}
        <div class="flex flex-wrap gap-1 text-[10px]">
          {#if song.difficultyLabel}
            <span class="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              {song.difficultyLabel}
              {#if song.difficultyScore != null}· {song.difficultyScore}/100{/if}
            </span>
          {/if}
          {#if song.jlptDistribution}
            {#each Object.entries(song.jlptDistribution) as [lvl, n]}
              {#if (n as number) > 0 && lvl !== 'none'}
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{lvl}·{n}</span>
              {/if}
            {/each}
          {/if}
        </div>
      {/if}
    </header>

    <!-- Tabs -->
    <nav class="flex rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800">
      {#each [['lyrics','가사'],['explanation','해설'],['vocab','단어'],['quiz','퀴즈']] as [k, label]}
        {@const active = tab === k}
        <button
          type="button"
          onclick={() => (tab = k as typeof tab)}
          class="flex-1 rounded-lg py-1.5 transition"
          class:bg-white={active}
          class:dark:bg-slate-700={active}
          class:shadow-sm={active}
          class:text-slate-500={!active}
        >{label}</button>
      {/each}
    </nav>

    {#if tab === 'lyrics'}
      <div class="flex gap-2 text-xs">
        <button type="button" onclick={revealAll} class="rounded-lg bg-slate-100 px-2 py-1 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">전체 펼치기</button>
        <button type="button" onclick={hideAll} class="rounded-lg bg-slate-100 px-2 py-1 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">전체 접기</button>
      </div>
      <ul class="space-y-1.5">
        {#each song.lyrics as line, i (i)}
          {@const open = revealedLines.has(i)}
          <li>
            <button
              type="button"
              onclick={() => toggleLine(i)}
              class="w-full rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow dark:bg-slate-800"
            >
              <div class="font-jp text-base">{line.jp}</div>
              {#if open}
                <div class="mt-1.5 text-xs text-slate-500 font-jp">{line.read}</div>
                <div class="mt-1 text-xs text-slate-700 dark:text-slate-300">{line.kr}</div>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else if tab === 'explanation'}
      {#if song.explanation.length === 0}
        <p class="text-sm text-slate-500">해설이 없어.</p>
      {:else}
        <ul class="space-y-2">
          {#each song.explanation as ch, i (i)}
            {@const open = openChapters.has(i)}
            <li class="rounded-xl bg-white shadow-sm dark:bg-slate-800">
              <button
                type="button"
                onclick={() => toggleChapter(i)}
                class="flex w-full items-center justify-between p-3 text-left"
              >
                <span class="font-medium">{ch.title}</span>
                <span class="text-slate-400">{open ? '−' : '+'}</span>
              </button>
              {#if open}
                <div class="border-t border-slate-100 px-3 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap dark:border-slate-700 dark:text-slate-300">
                  {ch.content}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {:else if tab === 'vocab'}
      {#if song.vocab.length === 0}
        <p class="text-sm text-slate-500">추출된 단어가 없어.</p>
      {:else}
        <p class="text-xs text-slate-500">총 {song.vocab.length}개. 카드를 클릭하면 단어 상세로.</p>
        <ul class="space-y-2">
          {#each song.vocab as v, i (v.term + i)}
            <li>
              <button
                type="button"
                onclick={() => v.vocabId ? push(`/word/${v.vocabId}`) : null}
                class="w-full rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow dark:bg-slate-800"
                disabled={!v.vocabId}
                class:opacity-70={!v.vocabId}
              >
                <div class="flex items-baseline justify-between gap-2">
                  <div>
                    <span class="font-jp text-base font-medium">{v.term}</span>
                    {#if v.read && v.read !== v.term}
                      <span class="ml-2 text-xs text-slate-500 font-jp">{v.read}</span>
                    {/if}
                  </div>
                  <div class="flex shrink-0 gap-1 text-[10px]">
                    {#if v.jlpt}
                      <span class="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{v.jlpt}</span>
                    {/if}
                    {#if v.vocabId}
                      <span class="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">사전</span>
                    {/if}
                  </div>
                </div>
                <div class="mt-1 text-sm text-slate-700 dark:text-slate-300">{v.meaning}</div>
                {#if v.description}
                  <div class="mt-1.5 text-xs text-slate-500 leading-relaxed">{v.description}</div>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    {:else if tab === 'quiz'}
      {#if !quiz}
        <p class="text-sm text-slate-500">퀴즈를 만들 데이터가 부족해.</p>
      {:else}
        <article class="space-y-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
          <div class="flex items-center justify-between text-xs">
            <span class="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              {quizTypeLabel[quiz.type]} 퀴즈
            </span>
            <button type="button" onclick={newQuiz} class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">↻ 새 문제</button>
          </div>
          <p class="rounded-lg bg-slate-50 p-3 text-center text-base font-jp dark:bg-slate-900">{quiz.question}</p>
          <ul class="space-y-1.5">
            {#each quiz.options as opt}
              {@const selected = quiz.selected === opt}
              {@const correct = quiz.selected != null && opt === quiz.correct}
              {@const wrong = selected && quiz.isCorrect === false}
              <li>
                <button
                  type="button"
                  onclick={() => answer(opt)}
                  disabled={quiz.selected != null}
                  class="w-full rounded-lg border p-2.5 text-left text-sm font-jp transition"
                  class:border-slate-200={!selected && !correct}
                  class:bg-white={!selected && !correct}
                  class:dark:border-slate-700={!selected && !correct}
                  class:dark:bg-slate-800={!selected && !correct}
                  class:border-emerald-500={correct}
                  class:bg-emerald-50={correct}
                  class:dark:bg-emerald-900={correct}
                  class:border-rose-500={wrong}
                  class:bg-rose-50={wrong}
                  class:dark:bg-rose-900={wrong}
                >{opt}</button>
              </li>
            {/each}
          </ul>
          {#if quiz.selected != null}
            <p class="text-center text-sm font-medium" class:text-emerald-600={quiz.isCorrect} class:text-rose-600={!quiz.isCorrect}>
              {quiz.isCorrect ? '정답이야 🎉' : `정답은 "${quiz.correct}"`}
            </p>
          {/if}
        </article>
      {/if}
    {/if}
  {/if}
</section>
