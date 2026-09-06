<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import TravelApplicationForm from '$lib/features/applications/components/TravelApplicationForm.svelte';
  import { mockPeople } from '$lib/features/applications/data/mock';
  import {
    applicationStore as defaultApplicationStore,
    draftStore as defaultDraftStore,
    roleState as defaultRoleState
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import type { DraftStore } from '$lib/features/applications/state/draft-store.svelte';
  import type { RoleState } from '$lib/features/applications/state/role-state.svelte';
  import type { Person } from '$lib/features/applications/domain/types';
  import { appPath } from '$lib/paths';

  let {
    applicationId,
    draftStore = defaultDraftStore,
    applicationStore = defaultApplicationStore,
    roleState = defaultRoleState,
    people = mockPeople,
    navigate = goto
  }: {
    applicationId?: string;
    draftStore?: DraftStore;
    applicationStore?: ApplicationStore;
    roleState?: RoleState;
    people?: Person[];
    navigate?: (path: string) => void | Promise<void>;
  } = $props();

  let routeId = $derived(applicationId ?? page.params.id);
  let application = $derived(
    applicationStore.applications.find(({ id }) => id === routeId)
  );
  let canEdit = $derived(
    !!application &&
      application.status === 'draft' &&
      roleState.currentPerson.id === application.applicant.id
  );

  $effect.pre(() => {
    if (canEdit && application && draftStore.editingId !== application.id) {
      draftStore.load(application);
    }
  });

  onMount(() => {
    const section = window.location.hash.slice(1);
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  });
</script>

<svelte:head>
  <title>{canEdit ? '编辑出差申请' : '无法编辑申请'}</title>
</svelte:head>

{#if !application || !canEdit}
  <section class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <h1 class="text-2xl font-bold text-slate-950">无法继续编辑该申请</h1>
    <p class="mt-2 text-sm text-slate-500">只有草稿状态且由当前申请人提交的申请可以继续编辑。</p>
    <a
      href={appPath(application ? `/applications/${application.id}` : '/applications')}
      class="mt-6 inline-flex min-h-11 items-center rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
    >
      {application ? '返回申请详情' : '返回申请列表'}
    </a>
  </section>
{:else}
  <div class="space-y-6">
    <header>
      <a
        href={appPath(`/applications/${application.id}`)}
        class="text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        ← 返回申请详情
      </a>
      <h1 class="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">编辑出差申请</h1>
      <p class="mt-2 text-sm text-slate-500">修改后可重新保存草稿，或预览后提交审批。</p>
    </header>

    <TravelApplicationForm {draftStore} {applicationStore} {people} {navigate} />
  </div>
{/if}
