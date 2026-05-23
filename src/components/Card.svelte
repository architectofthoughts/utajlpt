<script lang="ts">
  import type { VocabEntry } from '../types';

  interface Props {
    entry: VocabEntry;
    flipped: boolean;
    onflip: () => void;
  }

  let { entry, flipped, onflip }: Props = $props();
</script>

<button
  type="button"
  onclick={onflip}
  class="card-surface flex w-full flex-1 flex-col items-center justify-center gap-4 p-8 text-center transition active:scale-[0.99]"
  aria-label={flipped ? '카드 뒷면' : '카드 앞면, 탭하면 뒤집힘'}
>
  <div class="font-jp text-5xl tracking-tight sm:text-6xl">{entry.kanji}</div>
  {#if flipped}
    <div class="font-jp text-xl text-slate-500 dark:text-slate-400">{entry.reading}</div>
    <div class="mt-2 max-w-md font-ko text-base text-slate-700 dark:text-slate-200">
      {entry.meanings.slice(0, 3).join(', ')}
    </div>
    <div class="flex flex-wrap items-center justify-center gap-1 pt-2 text-xs text-slate-500">
      {#if entry.jlpt}<span class="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-700">{entry.jlpt}</span>{/if}
      {#if entry.freqRank}<span class="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-700">freq {entry.freqRank}</span>{/if}
      {#if entry.pos && entry.pos.length}<span class="text-slate-400">{entry.pos.slice(0, 2).join('·')}</span>{/if}
    </div>
  {:else}
    <div class="text-sm text-slate-400">탭하면 뜻과 요미카타가 보여</div>
  {/if}
</button>
