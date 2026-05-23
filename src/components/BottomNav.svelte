<script lang="ts">
  import { location, push } from 'svelte-spa-router';

  const tabs = [
    { path: '/', label: '학습', icon: '🎯' },
    { path: '/groups', label: '그룹', icon: '🗂' },
    { path: '/list', label: '목록', icon: '📚' },
    { path: '/add', label: '추가', icon: '➕' },
    { path: '/settings', label: '설정', icon: '⚙️' }
  ];
</script>

<nav class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
  <ul class="mx-auto grid max-w-md grid-cols-5">
    {#each tabs as t}
      <li>
        <button
          type="button"
          onclick={() => push(t.path)}
          class="flex w-full flex-col items-center gap-0.5 py-2 text-xs transition"
          class:text-slate-900={$location === t.path}
          class:dark:text-white={$location === t.path}
          class:text-slate-400={$location !== t.path}
          class:dark:text-slate-500={$location !== t.path}
        >
          <span class="text-lg">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>
