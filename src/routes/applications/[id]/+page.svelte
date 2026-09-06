<script lang="ts">
  import { page } from '$app/state';
  import ApplicationSummary from '$lib/components/ApplicationSummary.svelte';
  import ApprovalTimeline from '$lib/components/ApprovalTimeline.svelte';
  import RoleSwitcher from '$lib/components/RoleSwitcher.svelte';
  import ApprovalActions from '$lib/features/applications/components/ApprovalActions.svelte';
  import { mockPeople } from '$lib/features/applications/data/mock';
  import type { Person, WorkflowAction } from '$lib/features/applications/domain/types';
  import {
    applicationStore as defaultApplicationStore,
    roleState as defaultRoleState
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import type { RoleState } from '$lib/features/applications/state/role-state.svelte';
  import { appPath } from '$lib/paths';

  let {
    applicationId,
    applicationStore = defaultApplicationStore,
    roleState = defaultRoleState,
    people = mockPeople
  }: {
    applicationId?: string;
    applicationStore?: ApplicationStore;
    roleState?: RoleState;
    people?: Person[];
  } = $props();

  let retrying = $state(false);
  let routeId = $derived(applicationId ?? page.params.id);
  let application = $derived(
    applicationStore.applications.find(({ id }) => id === routeId)
  );

  function act(action: WorkflowAction, comment: string): void {
    if (!application || applicationStore.pendingPersistence) return;
    try {
      applicationStore.act(application.id, action, comment);
    } catch (error) {
      if (error instanceof Error && error.message === '申请信息不完整') return;
      throw error;
    }
  }

  function retryPersistence(): void {
    if (!applicationStore.pendingPersistence || retrying) return;
    retrying = true;
    applicationStore.retryPersistence();
    retrying = false;
  }
</script>

<svelte:head>
  <title>{application ? `${application.id} · 申请详情` : '未找到申请'}</title>
</svelte:head>

{#if !application}
  <section class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <h1 class="text-2xl font-bold text-slate-950">未找到该申请</h1>
    <p class="mt-2 text-sm text-slate-500">申请可能已被移除，或链接中的编号不正确。</p>
    <a
      href={appPath('/applications')}
      class="mt-6 inline-flex min-h-11 items-center rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
    >
      返回申请列表
    </a>
  </section>
{:else}
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <a href={appPath('/applications')} class="text-sm font-semibold text-teal-700 hover:text-teal-800">
          ← 返回申请列表
        </a>
        <h1 class="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">申请详情</h1>
        <p class="mt-2 text-sm text-slate-500">申请编号：{application.id}</p>
      </div>
      <div class="w-full lg:max-w-sm">
        <RoleSwitcher
          {people}
          selectedId={roleState.selectedId}
          onchange={(personId) => roleState.select(personId)}
        />
      </div>
    </header>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 class="mb-6 text-lg font-semibold text-slate-950">申请信息</h2>
      <ApplicationSummary {application} />
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 class="mb-6 text-lg font-semibold text-slate-950">审批记录</h2>
      <ApprovalTimeline approvals={application.approvals} />
    </section>

    {#if Object.keys(applicationStore.submitErrors).length > 0}
      <div
        role="alert"
        class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950"
      >
        <p class="font-semibold">请完善申请信息后再提交</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          {#each Object.entries(applicationStore.submitErrors) as [field, message] (field)}
            <li>{message}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if applicationStore.pendingPersistence}
      <div
        role="alert"
        class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <p>{applicationStore.pendingPersistence.warning}</p>
        <button
          type="button"
          disabled={retrying}
          onclick={retryPersistence}
          class="mt-3 font-semibold underline underline-offset-2 disabled:opacity-60"
        >
          {retrying ? '正在重试…' : '重试保存'}
        </button>
      </div>
    {/if}

    <ApprovalActions
      {application}
      actor={roleState.currentPerson}
      disabled={applicationStore.pendingPersistence !== null}
      onAction={act}
    />
  </div>
{/if}
