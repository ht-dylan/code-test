<script lang="ts">
  import type { Person, TravelApplication, WorkflowAction } from '../domain/types';
  import { allowedActions } from '../domain/workflow';

  let {
    application,
    actor,
    disabled = false,
    onAction
  }: {
    application: TravelApplication;
    actor: Person;
    disabled?: boolean;
    onAction: (action: WorkflowAction, comment: string) => void | Promise<void>;
  } = $props();

  let actions = $derived(allowedActions(application, actor));
  let confirmation = $state<Extract<WorkflowAction, 'approve' | 'withdraw'> | null>(null);
  let rejecting = $state(false);
  let rejectionReason = $state('');
  let rejectionError = $state('');
  let returnFocus = $state<HTMLElement | null>(null);
  let confirmationDialog = $state<HTMLDialogElement>();
  let confirmationInitialFocus = $state<HTMLButtonElement>();
  let rejectionDialog = $state<HTMLDialogElement>();
  let rejectionInitialFocus = $state<HTMLTextAreaElement>();

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const confirmationCopy = {
    approve: {
      title: '确认通过申请',
      description: '通过后，申请将进入下一审批阶段或完成审批。',
      button: '确认通过'
    },
    withdraw: {
      title: '确认撤回申请',
      description: '撤回后，本申请将结束且无法继续审批。',
      button: '确认撤回'
    }
  } as const;

  $effect(() => {
    if (confirmation && confirmationDialog && confirmationInitialFocus) {
      if (!confirmationDialog.open) confirmationDialog.showModal();
      confirmationInitialFocus.focus();
    }
  });

  $effect(() => {
    if (rejecting && rejectionDialog && rejectionInitialFocus) {
      if (!rejectionDialog.open) rejectionDialog.showModal();
      rejectionInitialFocus.focus();
    }
  });

  function rememberTrigger(event: MouseEvent): void {
    returnFocus = event.currentTarget as HTMLElement;
  }

  function restoreTrigger(): void {
    const trigger = returnFocus;
    returnFocus = null;
    trigger?.focus();
  }

  function closeConfirmation(): void {
    confirmationDialog?.close();
    confirmation = null;
    restoreTrigger();
  }

  function closeRejection(): void {
    rejectionDialog?.close();
    rejecting = false;
    rejectionReason = '';
    rejectionError = '';
    restoreTrigger();
  }

  function handleDialogKeydown(
    event: KeyboardEvent,
    dialog: HTMLDialogElement,
    cancel: () => void
  ): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1) as HTMLElement;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  async function perform(action: WorkflowAction, comment = ''): Promise<void> {
    if (disabled) return;
    if (confirmation) closeConfirmation();
    if (rejecting) closeRejection();
    await onAction(action, comment);
  }

  function submitRejection(): void {
    const reason = rejectionReason.trim();
    if (!reason) {
      rejectionError = '请输入驳回原因';
      return;
    }
    void perform('reject', reason);
  }

  function confirmAction(): void {
    const action = confirmation;
    if (action) void perform(action);
  }

  function openConfirmation(
    action: Extract<WorkflowAction, 'approve' | 'withdraw'>,
    event: MouseEvent
  ): void {
    rememberTrigger(event);
    confirmation = action;
  }

  function openRejection(event: MouseEvent): void {
    rememberTrigger(event);
    rejecting = true;
  }
</script>

{#if actions.length > 0}
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end" aria-label="申请操作">
    {#if actions.includes('submit')}
      <button
        type="button"
        {disabled}
        onclick={() => void perform('submit')}
        class="min-h-11 rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        提交申请
      </button>
    {/if}
    {#if actions.includes('approve')}
      <button
        type="button"
        {disabled}
        onclick={(event) => openConfirmation('approve', event)}
        class="min-h-11 rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        通过申请
      </button>
    {/if}
    {#if actions.includes('reject')}
      <button
        type="button"
        {disabled}
        onclick={openRejection}
        class="min-h-11 rounded-lg border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        驳回申请
      </button>
    {/if}
    {#if actions.includes('withdraw')}
      <button
        type="button"
        {disabled}
        onclick={(event) => openConfirmation('withdraw', event)}
        class="min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        撤回申请
      </button>
    {/if}
  </div>
{/if}

{#if confirmation}
  <dialog
    bind:this={confirmationDialog}
    class="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-transparent p-0 backdrop:bg-slate-950/45"
    aria-modal="true"
    aria-labelledby="confirmation-title"
    oncancel={(event) => {
      event.preventDefault();
      closeConfirmation();
    }}
    onkeydown={(event) =>
      handleDialogKeydown(event, confirmationDialog as HTMLDialogElement, closeConfirmation)}
  >
    <section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 id="confirmation-title" class="text-lg font-semibold text-slate-950">
        {confirmationCopy[confirmation].title}
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        {confirmationCopy[confirmation].description}
      </p>
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          bind:this={confirmationInitialFocus}
          onclick={closeConfirmation}
          class="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700"
        >
          取消
        </button>
        <button
          type="button"
          onclick={confirmAction}
          class="min-h-11 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white"
        >
          {confirmationCopy[confirmation].button}
        </button>
      </div>
    </section>
  </dialog>
{/if}

{#if rejecting}
  <dialog
    bind:this={rejectionDialog}
    class="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-transparent p-0 backdrop:bg-slate-950/45"
    aria-modal="true"
    aria-labelledby="rejection-title"
    oncancel={(event) => {
      event.preventDefault();
      closeRejection();
    }}
    onkeydown={(event) =>
      handleDialogKeydown(event, rejectionDialog as HTMLDialogElement, closeRejection)}
  >
    <section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 id="rejection-title" class="text-lg font-semibold text-slate-950">驳回申请</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">请填写明确原因，供申请人修改时参考。</p>
      <label class="mt-5 block">
        <span class="mb-1.5 block text-sm font-medium text-slate-700">驳回原因</span>
        <textarea
          bind:this={rejectionInitialFocus}
          rows="4"
          bind:value={rejectionReason}
          aria-invalid={rejectionError ? 'true' : undefined}
          aria-describedby={rejectionError ? 'rejection-error' : undefined}
          oninput={() => (rejectionError = '')}
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        ></textarea>
      </label>
      {#if rejectionError}
        <p id="rejection-error" class="mt-1 text-sm font-medium text-rose-700">
          {rejectionError}
        </p>
      {/if}
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onclick={closeRejection}
          class="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700"
        >
          取消
        </button>
        <button
          type="button"
          onclick={submitRejection}
          class="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white"
        >
          确认驳回
        </button>
      </div>
    </section>
  </dialog>
{/if}
