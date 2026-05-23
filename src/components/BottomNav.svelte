<script lang="ts">
  import { location, push } from 'svelte-spa-router';

  const tabs = [
    { path: '/', label: '학습', icon: '🎯' },
    { path: '/lyrics', label: '가사', icon: '🎵' },
    { path: '/library', label: '라이브러리', icon: '📚' },
    { path: '/add', label: '추가', icon: '➕' },
    { path: '/settings', label: '설정', icon: '⚙️' }
  ];

  // /songs/* 는 라이브러리 탭, /word/* 는 라이브러리 탭, /stats는 라이브러리 탭, /groups·/list 는 학습 탭 활성화
  function isActive(path: string, loc: string): boolean {
    if (path === loc) return true;
    if (path === '/library' && (loc.startsWith('/songs/') || loc.startsWith('/word/') || loc === '/stats')) return true;
    if (path === '/' && (loc === '/groups' || loc === '/list')) return true;
    return false;
  }
</script>

<nav class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
  <ul class="mx-auto grid max-w-md grid-cols-5">
    {#each tabs as t}
      {@const active = isActive(t.path, $location)}
      <li>
        <button
          type="button"
          onclick={() => push(t.path)}
          class="flex w-full flex-col items-center gap-0.5 py-2 text-xs transition"
          class:text-slate-900={active}
          class:dark:text-white={active}
          class:text-slate-400={!active}
          class:dark:text-slate-500={!active}
        >
          <span class="text-lg">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>
