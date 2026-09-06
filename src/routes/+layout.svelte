<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import '../app.css';
  import AppShell from '$lib/components/AppShell.svelte';
  import {
    applicationStore,
    initializeApplication
  } from '$lib/features/applications/state/app-state.svelte';

  let { children }: { children: Snippet } = $props();
  let warning = $state<string | null>(null);

  onMount(() => {
    initializeApplication();
    warning = applicationStore.warning;
  });

  function resetDemoData(): void {
    applicationStore.reset();
    warning = applicationStore.warning;
  }
</script>

<AppShell currentPath={page.url.pathname} {warning} onreset={resetDemoData}>
  {@render children()}
</AppShell>
