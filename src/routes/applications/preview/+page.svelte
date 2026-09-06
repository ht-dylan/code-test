<script lang="ts">
  import { goto } from '$app/navigation';
  import { mockPeople } from '$lib/features/applications/data/mock';
  import { validateDraft } from '$lib/features/applications/domain/validation';
  import {
    applicationStore as defaultApplicationStore,
    draftStore as defaultDraftStore
  } from '$lib/features/applications/state/app-state.svelte';
  import type { ApplicationStore } from '$lib/features/applications/state/application-store.svelte';
  import type { DraftStore } from '$lib/features/applications/state/draft-store.svelte';
  import type { Person } from '$lib/features/applications/domain/types';
  import { appPath } from '$lib/paths';

  let {
    draftStore = defaultDraftStore,
    applicationStore = defaultApplicationStore,
    people = mockPeople,
    navigate = goto,
    validationDate = localDate()
  }: {
    draftStore?: DraftStore;
    applicationStore?: ApplicationStore;
    people?: Person[];
    navigate?: (path: string) => void | Promise<void>;
    validationDate?: string;
  } = $props();

  let saving = $state(false);
  let retrying = $state(false);
  let applicant = $derived(people.find(({ id }) => id === draftStore.draft.applicantId));
  let canPreview = $derived(
    Object.keys(validateDraft(draftStore.draft, validationDate, applicant)).length === 0
  );
  let formHref = $derived(appPath(draftStore.formPath()));
  let applicantHref = $derived(appPath(draftStore.formPath('applicant')));
  let travelHref = $derived(appPath(draftStore.formPath('travel')));

  const currencyFormatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  });

  function localDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  async function confirm(): Promise<void> {
    if (
      saving ||
      applicationStore.pendingPersistence ||
      Object.keys(draftStore.validate()).length > 0
    ) return;

    saving = true;
    const payload = { ...draftStore.draft };
    const saved = draftStore.editingId
      ? applicationStore.update(draftStore.editingId, payload, 'submit')
      : applicationStore.create(payload, 'submit');
    if (applicationStore.pendingPersistence) {
      saving = false;
      return;
    }

    draftStore.clear();
    await navigate(appPath(`/applications/${saved.id}`));
    saving = false;
  }

  async function retrySave(): Promise<void> {
    const pending = applicationStore.pendingPersistence;
    if (!pending || retrying) return;

    retrying = true;
    const result = applicationStore.retryPersistence();
    if (!result.persisted) {
      retrying = false;
      return;
    }

    draftStore.clear();
    await navigate(appPath(`/applications/${pending.applicationId}`));
    retrying = false;
  }
</script>

<svelte:head>
  <title>预览出差申请</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  {#if !canPreview || !applicant}
    <section class="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <h1 class="text-xl font-semibold text-slate-950">暂无可预览的申请</h1>
      <p class="mt-2 text-sm text-slate-500">请先完整填写申请内容，再进入预览。</p>
      <a
        href={formHref}
        class="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        返回填写申请
      </a>
    </section>
  {:else}
    <header class="mb-7">
      <p class="text-sm font-medium text-blue-600">提交前确认</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">预览出差申请</h1>
      <p class="mt-2 text-sm text-slate-500">请核对以下信息，确认无误后提交审批。</p>
    </header>

    <div class="space-y-6">
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-semibold text-slate-950">申请人信息</h2>
          {#if applicationStore.pendingPersistence}
            <span aria-disabled="true" class="text-sm font-semibold text-slate-400">
              编辑申请人信息
            </span>
          {:else}
            <a
              href={applicantHref}
              class="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              编辑申请人信息
            </a>
          {/if}
        </div>
        <dl class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs font-medium text-slate-500">姓名</dt>
            <dd class="mt-1 text-sm font-semibold text-slate-900">{applicant.name}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">工号</dt>
            <dd class="mt-1 text-sm text-slate-700">{applicant.employeeNo}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">部门</dt>
            <dd class="mt-1 text-sm text-slate-700">{applicant.department}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">职位</dt>
            <dd class="mt-1 text-sm text-slate-700">{applicant.title}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">联系方式</dt>
            <dd class="mt-1 text-sm text-slate-700">{applicant.contact}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-semibold text-slate-950">行程信息</h2>
          {#if applicationStore.pendingPersistence}
            <span aria-disabled="true" class="text-sm font-semibold text-slate-400">
              编辑行程信息
            </span>
          {:else}
            <a
              href={travelHref}
              class="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              编辑行程信息
            </a>
          {/if}
        </div>
        <dl class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs font-medium text-slate-500">行程</dt>
            <dd class="mt-1 text-sm font-semibold text-slate-900">
              {draftStore.draft.origin} → {draftStore.draft.destination}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">出差日期</dt>
            <dd class="mt-1 text-sm text-slate-700">
              {draftStore.draft.startDate} 至 {draftStore.draft.endDate}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">交通方式</dt>
            <dd class="mt-1 text-sm text-slate-700">{draftStore.draft.transport}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">预计预算</dt>
            <dd class="mt-1 text-sm font-semibold text-slate-900">
              {currencyFormatter.format(draftStore.draft.budget ?? 0)}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-slate-500">出差事由</dt>
            <dd class="mt-1 text-sm leading-6 text-slate-700">{draftStore.draft.purpose}</dd>
          </div>
          {#if draftStore.draft.notes}
            <div class="sm:col-span-2 lg:col-span-3">
              <dt class="text-xs font-medium text-slate-500">备注</dt>
              <dd class="mt-1 text-sm leading-6 text-slate-700">{draftStore.draft.notes}</dd>
            </div>
          {/if}
        </dl>
      </section>
    </div>

    {#if applicationStore.pendingPersistence}
      <div
        role="alert"
        class="mt-7 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <p>{applicationStore.pendingPersistence.warning}</p>
        <button
          type="button"
          disabled={retrying}
          class="mt-3 font-semibold text-amber-950 underline underline-offset-2 disabled:opacity-60"
          onclick={retrySave}
        >
          {retrying ? '正在重试…' : '重试保存'}
        </button>
      </div>
    {/if}

    <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {#if applicationStore.pendingPersistence}
        <span
          aria-disabled="true"
          class="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2.5 text-center text-sm font-semibold text-slate-400"
        >
          返回修改
        </span>
      {:else}
        <a
          href={formHref}
          class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          返回修改
        </a>
      {/if}
      <button
        type="button"
        disabled={saving || applicationStore.pendingPersistence !== null}
        class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={confirm}
      >
        {saving ? '正在提交…' : '确认提交'}
      </button>
    </div>
  {/if}
</div>
