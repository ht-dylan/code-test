<script lang="ts">
  import ApplicationFilters, {
    type ApplicationFilterValue
  } from '$lib/features/applications/components/ApplicationFilters.svelte';
  import { mockPeople } from '$lib/features/applications/data/mock';
  import type { Person, TravelApplication } from '$lib/features/applications/domain/types';
  import {
    applicationStore as defaultApplicationStore,
    roleState as defaultRoleState
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import type { RoleState } from '$lib/features/applications/state/role-state.svelte';
  import RoleSwitcher from '$lib/components/RoleSwitcher.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { appPath } from '$lib/paths';

  let {
    applicationStore = defaultApplicationStore,
    roleState = defaultRoleState,
    people = mockPeople
  }: {
    applicationStore?: ApplicationStore;
    roleState?: RoleState;
    people?: Person[];
  } = $props();

  let filters = $state<ApplicationFilterValue>({
    keyword: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  let viewAll = $state(false);

  const currencyFormatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  });
  const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  let filteredApplications = $derived(
    applicationStore.applications
      .filter((application) => visibleToActor(application, roleState.currentPerson, viewAll))
      .filter((application) => matchesFilters(application, filters))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  );

  function visibleToActor(
    application: TravelApplication,
    actor: Person,
    showAll: boolean
  ): boolean {
    if (showAll) return true;
    if (application.applicant.id === actor.id) return true;
    if (actor.role === 'manager') return application.status === 'pending_manager';
    if (actor.role === 'finance') return application.status === 'pending_finance';
    return false;
  }

  function matchesFilters(
    application: TravelApplication,
    value: ApplicationFilterValue
  ): boolean {
    const keyword = value.keyword.trim().toLocaleLowerCase('zh-CN');
    const searchable = [
      application.id,
      application.applicant.name,
      application.travel.destination
    ]
      .join(' ')
      .toLocaleLowerCase('zh-CN');

    return (
      (!keyword || searchable.includes(keyword)) &&
      (!value.status || application.status === value.status) &&
      (!value.startDate || application.travel.startDate >= value.startDate) &&
      (!value.endDate || application.travel.endDate <= value.endDate)
    );
  }

  function formatBudget(value: number | null): string {
    return value === null ? '未填写' : currencyFormatter.format(value);
  }
</script>

<svelte:head>
  <title>申请列表</title>
</svelte:head>

<div class="space-y-6">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="text-sm font-medium text-teal-700">出差申请</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">申请列表</h1>
      <p class="mt-2 text-sm text-slate-500">默认只显示与当前角色相关的申请。</p>
    </div>
    <div class="w-full lg:max-w-sm">
      <RoleSwitcher
        {people}
        selectedId={roleState.selectedId}
        onchange={(personId) => roleState.select(personId)}
      />
    </div>
  </header>

  <div class="flex flex-col gap-4">
    <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        bind:checked={viewAll}
        class="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
      查看全部申请
    </label>
    <ApplicationFilters onfilter={(value) => (filters = value)} />
  </div>

  {#if applicationStore.applications.length === 0}
    <section class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <h2 class="text-lg font-semibold text-slate-900">暂无申请记录</h2>
      <p class="mt-2 text-sm text-slate-500">发起第一份出差申请后，会显示在这里。</p>
      <a
        href={appPath('/applications/new')}
        class="mt-5 inline-flex min-h-11 items-center rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
      >
        发起申请
      </a>
    </section>
  {:else if filteredApplications.length === 0}
    <section class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <h2 class="text-lg font-semibold text-slate-900">没有符合筛选条件的申请</h2>
      <p class="mt-2 text-sm text-slate-500">请调整关键词、状态或日期范围。</p>
    </section>
  {:else}
    <section aria-label="申请结果">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm text-slate-500">共 {filteredApplications.length} 条申请</p>
      </div>
      <ul class="space-y-3">
        {#each filteredApplications as application (application.id)}
          <li>
            <a
              href={appPath(`/applications/${application.id}`)}
              class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md sm:p-5 md:grid-cols-[1.1fr_0.8fr_1fr_1.35fr_0.9fr_0.9fr_1.1fr] md:items-center"
              aria-label={`查看申请 ${application.id}`}
            >
              <div>
                <span class="text-xs text-slate-500 md:sr-only">申请编号</span>
                <p class="mt-1 text-sm font-semibold text-teal-700 md:mt-0">{application.id}</p>
              </div>
              <div>
                <span class="text-xs text-slate-500 md:sr-only">申请人</span>
                <p class="mt-1 text-sm font-medium text-slate-900 md:mt-0">
                  {application.applicant.name}
                </p>
              </div>
              <div>
                <span class="text-xs text-slate-500 md:sr-only">目的地</span>
                <p class="mt-1 text-sm text-slate-700 md:mt-0">{application.travel.destination}</p>
              </div>
              <div>
                <span class="text-xs text-slate-500 md:sr-only">出差日期</span>
                <p class="mt-1 text-sm text-slate-700 md:mt-0">
                  {application.travel.startDate} 至 {application.travel.endDate}
                </p>
              </div>
              <div>
                <span class="text-xs text-slate-500 md:sr-only">预算</span>
                <p class="mt-1 text-sm font-medium text-slate-900 md:mt-0">
                  {formatBudget(application.travel.budget)}
                </p>
              </div>
              <div>
                <span class="sr-only">申请状态</span>
                <StatusBadge status={application.status} />
              </div>
              <div>
                <span class="text-xs text-slate-500 md:sr-only">更新时间</span>
                <time class="mt-1 block text-xs text-slate-500 md:mt-0" datetime={application.updatedAt}>
                  {timeFormatter.format(new Date(application.updatedAt))}
                </time>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
