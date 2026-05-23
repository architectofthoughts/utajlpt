<script lang="ts">
  import { computeLevel, asciiBar } from '../lib/leveling';

  interface Props {
    masteredTotal: number;
    /** Compact = single-line variant for headers. */
    compact?: boolean;
  }

  let { masteredTotal, compact = false }: Props = $props();

  let info = $derived(computeLevel(masteredTotal));
  let bar = $derived(asciiBar(info.current, info.need, compact ? 10 : 18));
</script>

<div
  class="rounded-md border border-amber-800/40 bg-stone-900 px-3 py-2 font-mono text-amber-300 shadow-inner"
  class:py-1={compact}
  class:text-[11px]={compact}
  class:text-xs={!compact}
>
  <div class="flex items-baseline justify-between gap-2">
    <span class="font-bold tracking-wider text-amber-200">
      [ Lv.{info.level} ]
    </span>
    <span class="text-amber-500/80">
      {info.current}/{info.need} XP
    </span>
  </div>
  <div class="mt-0.5 whitespace-pre tracking-tight text-amber-400">
    <span aria-hidden="true">{bar}</span>
  </div>
  {#if !compact}
    <div class="mt-1 text-[10px] uppercase tracking-widest text-amber-700">
      mastered: {info.total}
    </div>
  {/if}
</div>
