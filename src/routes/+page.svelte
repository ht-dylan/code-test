<script lang="ts">
  import EChart, { type EChartsOption } from '$lib/components/EChart.svelte';
  import RoleSwitcher from '$lib/components/RoleSwitcher.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import MetricCard from '$lib/features/applications/components/MetricCard.svelte';
  import { mockPeople } from '$lib/features/applications/data/mock';
  import {
    monthlyTrend,
    statusBreakdown,
    summarizeApplications
  } from '$lib/features/applications/domain/statistics';
  import type {
    ApplicationStatus,
    Person
  } from '$lib/features/applications/domain/types';
  import {
    applicationStore as defaultApplicationStore,
    roleState as defaultRoleState
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import type { RoleState } from '$lib/features/applications/state/role-state.svelte';
  import { appPath } from '$lib/paths';

  let {
    applicationStore = defaultApplicationStore,
    roleState = defaultRoleState,
    people = mockPeople,
    now = new Date()
  }: {
    applicationStore?: ApplicationStore;
    roleState?: RoleState;
    people?: Person[];
    now?: Date;
  } = $props();

  const currencyFormatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  });
  const statusLabels: Record<ApplicationStatus, string> = {
    draft: '草稿',
    pending_manager: '经理审批',
    pending_finance: '财务审批',
    approved: '已通过',
    rejected: '已驳回',
    withdrawn: '已撤回'
  };
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  let summary = $derived(summarizeApplications(applicationStore.applications, now));
  let statusData = $derived(statusBreakdown(applicationStore.applications));
  let currentMonthBudget = $derived(
    monthlyTrend(applicationStore.applications, now).at(-1)?.budget ?? 0
  );
  let activeApplicants = $derived(
    new Set(applicationStore.applications.map(({ applicant }) => applicant.id)).size
  );
  let statusOption = $derived.by<EChartsOption>(() => ({
    color: ['#0f766e', '#0891b2', '#1d4ed8', '#16a34a', '#dc2626', '#64748b'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        name: '申请状态',
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['50%', '44%'],
        label: { formatter: '{b}\n{c}' },
        data: statusData.map(({ status, value }) => ({
          name: statusLabels[status],
          value
        }))
      }
    ]
  }));
</script>

<svelte:head>
  <title>TripFlow 工作台</title>
</svelte:head>

<div class="space-y-6">
  <section
    class="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-teal-900 p-6 text-white shadow-lg sm:p-8 lg:grid-cols-[1fr_22rem] lg:items-center"
  >
    <div>
      <p class="text-sm font-semibold tracking-wide text-teal-300">TRIPFLOW 企业差旅</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        欢迎回来，{roleState.currentPerson.name}
      </h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
        集中掌握差旅申请、审批进度与预算动态，让每次出行决策清晰可控。
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <a
          href={appPath('/applications/new')}
          class="inline-flex min-h-11 items-center rounded-lg bg-teal-500 px-5 text-sm font-semibold text-slate-950 hover:bg-teal-400"
        >
          发起申请
        </a>
        <a
          href={appPath('/applications')}
          class="inline-flex min-h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          查看申请
        </a>
      </div>
    </div>
    <RoleSwitcher
      {people}
      selectedId={roleState.selectedId}
      onchange={(personId) => roleState.select(personId)}
    />
  </section>

  <section aria-label="工作台指标" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div data-testid="pending-metric">
      <MetricCard
        label="待我处理"
        value={String(applicationStore.pendingCount)}
        hint={`当前身份：${roleState.currentPerson.name}`}
        tone="blue"
      />
    </div>
    <MetricCard label="活跃申请人" value={String(activeApplicants)} hint="已有申请的员工人数" />
    <MetricCard
      label="本月申请预算"
      value={currencyFormatter.format(currentMonthBudget)}
      hint="按申请创建时间汇总"
      tone="blue"
    />
    <MetricCard label="审批通过率" value={`${summary.approvedRate}%`} hint="已通过 / 全部申请" />
  </section>

  <div class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">最近申请</h2>
          <p class="mt-1 text-sm text-slate-500">按创建时间展示最近五条记录。</p>
        </div>
        <a href={appPath('/applications')} class="text-sm font-semibold text-teal-700 hover:text-teal-800">
          查看全部
        </a>
      </div>

      {#if applicationStore.recentApplications.length === 0}
        <div class="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
          <p class="font-medium text-slate-800">暂无申请记录</p>
          <p class="mt-1 text-sm text-slate-500">发起申请后，最新进度会显示在这里。</p>
        </div>
      {:else}
        <ul class="mt-5 divide-y divide-slate-100">
          {#each applicationStore.recentApplications as application (application.id)}
            <li data-testid="recent-application">
              <a
                href={appPath(`/applications/${application.id}`)}
                class="grid gap-2 py-4 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center sm:px-2"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold text-teal-700">{application.id}</span>
                    <StatusBadge status={application.status} />
                  </div>
                  <p class="mt-1 text-sm font-medium text-slate-900">
                    {application.applicant.name} · {application.travel.destination}
                  </p>
                </div>
                <div class="text-sm text-slate-500 sm:text-right">
                  <p>{currencyFormatter.format(application.travel.budget ?? 0)}</p>
                  <time datetime={application.createdAt}>
                    {dateFormatter.format(new Date(application.createdAt))}
                  </time>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 class="text-lg font-semibold text-slate-950">申请状态</h2>
      <p class="mt-1 text-sm text-slate-500">全部申请的实时流程分布。</p>
      <EChart option={statusOption} label="工作台申请状态分布图" />
    </section>
  </div>
</div>
