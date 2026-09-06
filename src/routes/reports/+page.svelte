<script lang="ts">
  import EChart, { type EChartsOption } from '$lib/components/EChart.svelte';
  import MetricCard from '$lib/features/applications/components/MetricCard.svelte';
  import {
    applicationStore as defaultApplicationStore
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import {
    departmentBudgets,
    monthlyTrend,
    statusBreakdown,
    summarizeApplications
  } from '$lib/features/applications/domain/statistics';
  import type { ApplicationStatus } from '$lib/features/applications/domain/types';

  let {
    applicationStore = defaultApplicationStore,
    now = new Date()
  }: {
    applicationStore?: ApplicationStore;
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
  const chartColors = ['#0f766e', '#0891b2', '#1d4ed8', '#16a34a', '#dc2626', '#64748b'];

  let summary = $derived(summarizeApplications(applicationStore.applications, now));
  let statuses = $derived(statusBreakdown(applicationStore.applications));
  let trend = $derived(monthlyTrend(applicationStore.applications, now));
  let budgets = $derived(departmentBudgets(applicationStore.applications));

  let statusOption = $derived.by<EChartsOption>(() => ({
    color: chartColors,
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        name: '申请状态',
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '44%'],
        label: { formatter: '{b}\n{c}' },
        data: statuses.map(({ status, value }) => ({ name: statusLabels[status], value }))
      }
    ]
  }));

  let trendOption = $derived.by<EChartsOption>(() => ({
    color: ['#0f766e', '#1d4ed8'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 20, right: 28, bottom: 16, top: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: trend.map(({ month }) => month),
      axisLine: { lineStyle: { color: '#cbd5e1' } }
    },
    yAxis: [
      { type: 'value', name: '申请数', minInterval: 1 },
      { type: 'value', name: '预算（元）' }
    ],
    series: [
      {
        name: '申请数量',
        type: 'bar',
        barMaxWidth: 34,
        data: trend.map(({ applications }) => applications)
      },
      {
        name: '预算金额',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: trend.map(({ budget }) => budget)
      }
    ]
  }));

  let departmentOption = $derived.by<EChartsOption>(() => ({
    color: ['#0f766e'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 20, right: 28, bottom: 16, top: 16, containLabel: true },
    xAxis: { type: 'value', name: '元' },
    yAxis: {
      type: 'category',
      inverse: true,
      data: budgets.map(({ department }) => department)
    },
    series: [
      {
        name: '部门预算',
        type: 'bar',
        barMaxWidth: 32,
        data: budgets.map(({ budget }) => budget)
      }
    ]
  }));
</script>

<svelte:head>
  <title>统计报表</title>
</svelte:head>

<div class="space-y-6">
  <header>
    <p class="text-sm font-medium text-teal-700">数据洞察</p>
    <h1 class="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">统计报表</h1>
    <p class="mt-2 text-sm text-slate-500">基于当前申请数据实时汇总，不保存额外图表数据。</p>
  </header>

  {#if applicationStore.applications.length === 0}
    <p class="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      暂无申请数据，图表将显示零值。
    </p>
  {/if}

  <section aria-label="核心指标" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <MetricCard label="申请总数" value={String(summary.total)} hint="当前全部申请" />
    <MetricCard label="审批通过率" value={`${summary.approvedRate}%`} hint="已通过 / 全部申请" tone="blue" />
    <MetricCard label="申请预算总额" value={currencyFormatter.format(summary.totalBudget)} hint="全部申请预算" />
    <MetricCard
      label="平均审批时长"
      value={`${summary.averageApprovalHours.toFixed(1)} 小时`}
      hint="已完成审批流程"
      tone="blue"
    />
  </section>

  <div class="grid gap-6 xl:grid-cols-2">
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 class="text-lg font-semibold text-slate-950">申请状态分布</h2>
      <p class="mt-1 text-sm text-slate-500">查看各流程状态下的申请数量。</p>
      <EChart option={statusOption} label="申请状态分布图" />
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 class="text-lg font-semibold text-slate-950">近六个月申请趋势</h2>
      <p class="mt-1 text-sm text-slate-500">对比申请数量与预算金额变化。</p>
      <EChart option={trendOption} label="近六个月申请趋势图" />
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 xl:col-span-2">
      <h2 class="text-lg font-semibold text-slate-950">部门预算</h2>
      <p class="mt-1 text-sm text-slate-500">按部门汇总申请预算并由高到低排列。</p>
      <EChart option={departmentOption} label="部门预算分布图" />
    </section>
  </div>
</div>
