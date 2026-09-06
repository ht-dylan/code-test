<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import TravelApplicationForm from '$lib/features/applications/components/TravelApplicationForm.svelte';
  import { mockPeople } from '$lib/features/applications/data/mock';
  import {
    applicationStore as defaultApplicationStore,
    draftStore as defaultDraftStore
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import type { DraftStore } from '$lib/features/applications/state/draft-store.svelte';
  import type { Person } from '$lib/features/applications/domain/types';

  let {
    draftStore = defaultDraftStore,
    applicationStore = defaultApplicationStore,
    people = mockPeople,
    navigate = goto
  }: {
    draftStore?: DraftStore;
    applicationStore?: ApplicationStore;
    people?: Person[];
    navigate?: (path: string) => void | Promise<void>;
  } = $props();

  onMount(() => {
    const section = window.location.hash.slice(1);
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  });
</script>

<svelte:head>
  <title>新建出差申请</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <header class="mb-7">
    <p class="text-sm font-medium text-blue-600">出差申请</p>
    <h1 class="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">新建出差申请</h1>
    <p class="mt-2 text-sm text-slate-500">填写申请人与行程信息，可保存草稿或预览后提交。</p>
  </header>

  <TravelApplicationForm {draftStore} {applicationStore} {people} {navigate} />
</div>
