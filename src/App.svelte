<script lang="ts">
  import Router from 'svelte-spa-router';
  import { onMount } from 'svelte';
  import Study from './routes/Study.svelte';
  import Groups from './routes/Groups.svelte';
  import List from './routes/List.svelte';
  import Add from './routes/Add.svelte';
  import SettingsPage from './routes/Settings.svelte';
  import BottomNav from './components/BottomNav.svelte';
  import { ensureVocabLoaded } from './lib/vocab';

  const routes = {
    '/': Study,
    '/groups': Groups,
    '/list': List,
    '/add': Add,
    '/settings': SettingsPage
  };

  let loadState: 'pending' | 'ready' | 'error' = $state('pending');
  let loadError = $state<string | null>(null);

  onMount(async () => {
    try {
      await ensureVocabLoaded();
      loadState = 'ready';
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
      loadState = 'error';
    }
  });
</script>

<div class="flex min-h-full flex-col text-slate-900 dark:text-slate-100 font-ko">
  <main class="flex-1 pb-20">
    {#if loadState === 'pending'}
      <div class="flex h-full items-center justify-center p-8 text-slate-500">
        단어 데이터를 불러오는 중…
      </div>
    {:else if loadState === 'error'}
      <div class="p-8 text-center text-rose-500">
        데이터 로딩 실패: {loadError}
      </div>
    {:else}
      <Router {routes} />
    {/if}
  </main>
  <BottomNav />
</div>
