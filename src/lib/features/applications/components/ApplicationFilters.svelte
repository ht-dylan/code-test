<script module lang="ts">
  import type { ApplicationStatus } from '../domain/types';

  export interface ApplicationFilterValue {
    keyword: string;
    status: ApplicationStatus | '';
    startDate: string;
    endDate: string;
  }
</script>

<script lang="ts">
  import SelectControl from '$lib/components/SelectControl.svelte';

  let {
    onfilter
  }: {
    onfilter: (value: ApplicationFilterValue) => void;
  } = $props();

  let keyword = $state('');
  let status = $state<ApplicationStatus | ''>('');
  let startDate = $state('');
  let endDate = $state('');

  function emit(): void {
    onfilter({ keyword, status, startDate, endDate });
  }

  function clear(): void {
    keyword = '';
    status = '';
    startDate = '';
    endDate = '';
    emit();
  }
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,2fr)_1fr_1fr_1fr_auto] lg:items-end">
    <label class="block sm:col-span-2 lg:col-span-1">
      <span class="mb-1.5 block text-sm font-medium text-slate-700">搜索申请</span>
      <input
        type="search"
        bind:value={keyword}
        oninput={emit}
        placeholder="申请编号、申请人或目的地"
        class="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
      />
    </label>

    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-slate-700">申请状态</span>
      <SelectControl bind:value={status} onchange={emit}>
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending_manager">待主管审批</option>
        <option value="pending_finance">待财务审批</option>
        <option value="approved">已通过</option>
        <option value="rejected">已驳回</option>
        <option value="withdrawn">已撤回</option>
      </SelectControl>
    </label>

    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-slate-700">开始日期</span>
      <input
        type="date"
        bind:value={startDate}
        oninput={emit}
        class="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
      />
    </label>

    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-slate-700">结束日期</span>
      <input
        type="date"
        bind:value={endDate}
        oninput={emit}
        class="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
      />
    </label>

    <button
      type="button"
      onclick={clear}
      class="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      清除筛选
    </button>
  </div>
</section>
