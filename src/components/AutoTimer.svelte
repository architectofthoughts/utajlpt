<script lang="ts">
  interface Props {
    /** 0..1 progress; rendered as a horizontal bar. */
    progress: number;
    active: boolean;
  }

  let { progress, active }: Props = $props();
</script>

<div class="relative h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
  {#if active}
    <div
      class="absolute inset-y-0 left-0 bg-slate-900 transition-[width] duration-100 ease-linear dark:bg-slate-100"
      style="width: {(progress * 100).toFixed(1)}%"
    ></div>
  {/if}
</div>
