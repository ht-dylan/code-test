<script lang="ts">
  import type { TravelApplication } from '$lib/features/applications/domain/types';
  import StatusBadge from './StatusBadge.svelte';

  let { application }: { application: TravelApplication } = $props();

  const currencyFormatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  });

  function formatBudget(value: number | null) {
    return value === null ? '未填写' : currencyFormatter.format(value);
  }
</script>

<dl class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
  <div>
    <dt class="text-xs font-medium text-slate-500">申请人</dt>
    <dd class="mt-1 text-sm font-semibold text-slate-900">{application.applicant.name}</dd>
  </div>
  <div>
    <dt class="text-xs font-medium text-slate-500">工号</dt>
    <dd class="mt-1 text-sm text-slate-700">{application.applicant.employeeNo}</dd>
  </div>
  <div>
    <dt class="text-xs font-medium text-slate-500">申请状态</dt>
    <dd class="mt-1"><StatusBadge status={application.status} /></dd>
  </div>
  <div>
    <dt class="text-xs font-medium text-slate-500">行程</dt>
    <dd class="mt-1 text-sm text-slate-700">
      {application.travel.origin} → {application.travel.destination}
    </dd>
  </div>
  <div>
    <dt class="text-xs font-medium text-slate-500">出差日期</dt>
    <dd class="mt-1 text-sm text-slate-700">
      {application.travel.startDate} 至 {application.travel.endDate}
    </dd>
  </div>
  <div>
    <dt class="text-xs font-medium text-slate-500">交通方式</dt>
    <dd class="mt-1 text-sm text-slate-700">{application.travel.transport || '未填写'}</dd>
  </div>
  <div>
    <dt class="text-xs font-medium text-slate-500">预算</dt>
    <dd class="mt-1 text-sm font-semibold text-slate-900">
      {formatBudget(application.travel.budget)}
    </dd>
  </div>
  <div class="sm:col-span-2">
    <dt class="text-xs font-medium text-slate-500">出差事由</dt>
    <dd class="mt-1 text-sm leading-6 text-slate-700">{application.travel.purpose}</dd>
  </div>
  {#if application.travel.notes}
    <div class="sm:col-span-2 lg:col-span-3">
      <dt class="text-xs font-medium text-slate-500">备注</dt>
      <dd class="mt-1 text-sm leading-6 text-slate-700">{application.travel.notes}</dd>
    </div>
  {/if}
</dl>
