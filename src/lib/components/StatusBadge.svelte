<script lang="ts">
  import type { ApplicationStatus } from '$lib/features/applications/domain/types';

  let { status }: { status: ApplicationStatus } = $props();

  const statusDetails: Record<ApplicationStatus, { label: string; classes: string }> = {
    draft: { label: '草稿', classes: 'border-slate-200 bg-slate-100 text-slate-700' },
    pending_manager: {
      label: '待主管审批',
      classes: 'border-amber-200 bg-amber-50 text-amber-800'
    },
    pending_finance: {
      label: '待财务审批',
      classes: 'border-blue-200 bg-blue-50 text-blue-800'
    },
    approved: { label: '已通过', classes: 'border-teal-200 bg-teal-50 text-teal-800' },
    rejected: { label: '已驳回', classes: 'border-rose-200 bg-rose-50 text-rose-800' },
    withdrawn: { label: '已撤回', classes: 'border-slate-300 bg-white text-slate-600' }
  };

  const detail = $derived(statusDetails[status]);
</script>

<span
  class={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${detail.classes}`}
>
  {detail.label}
</span>
