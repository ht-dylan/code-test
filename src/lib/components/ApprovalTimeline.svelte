<script lang="ts">
  import type {
    ApprovalRecord,
    Role,
    WorkflowAction
  } from '$lib/features/applications/domain/types';

  let { approvals }: { approvals: ApprovalRecord[] } = $props();

  const actionLabels: Record<WorkflowAction, string> = {
    submit: '提交申请',
    approve: '通过',
    reject: '驳回',
    withdraw: '撤回'
  };

  const roleLabels: Record<Role, string> = {
    applicant: '申请人',
    manager: '主管',
    finance: '财务'
  };

  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  function formatTime(value: string) {
    return dateFormatter.format(new Date(value));
  }
</script>

{#if approvals.length === 0}
  <p class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
    暂无审批记录
  </p>
{:else}
  <ol class="space-y-0" aria-label="审批流程">
    {#each approvals as approval, index (approval.id)}
      <li class="relative grid grid-cols-[1.25rem_1fr] gap-3 pb-6 last:pb-0">
        {#if index < approvals.length - 1}
          <span
            class="absolute bottom-0 left-[0.59375rem] top-5 w-px bg-slate-200"
            aria-hidden="true"
          ></span>
        {/if}
        <span
          class="relative mt-1 block h-5 w-5 rounded-full border-4 border-white bg-teal-500 shadow-sm ring-1 ring-teal-200"
          aria-hidden="true"
        ></span>
        <article class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="text-sm font-semibold text-slate-900">{approval.actorName}</strong>
              <span class="text-xs text-slate-500">{roleLabels[approval.actorRole]}</span>
              <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {actionLabels[approval.action]}
              </span>
            </div>
            <time class="text-xs text-slate-500" datetime={approval.createdAt}>
              {formatTime(approval.createdAt)}
            </time>
          </div>
          {#if approval.comment}
            <p class="mt-3 text-sm leading-6 text-slate-600">{approval.comment}</p>
          {/if}
        </article>
      </li>
    {/each}
  </ol>
{/if}
