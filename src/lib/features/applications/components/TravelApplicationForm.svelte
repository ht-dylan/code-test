<script lang="ts">
  import type { Person, TravelFormDraft } from '../domain/types';
  import type { ApplicationStore } from '../state/application-store.svelte';
  import type { DraftStore } from '../state/draft-store.svelte';
  import { appPath } from '$lib/paths';
  import SelectControl from '$lib/components/SelectControl.svelte';

  let {
    draftStore,
    applicationStore,
    people,
    navigate
  }: {
    draftStore: DraftStore;
    applicationStore: ApplicationStore;
    people: Person[];
    navigate: (path: string) => void | Promise<void>;
  } = $props();

  let selectedApplicant = $derived(
    people.find(({ id }) => id === draftStore.draft.applicantId)
  );
  let retrying = $state(false);

  const fieldIds: Record<keyof TravelFormDraft, string> = {
    applicantId: 'applicantId',
    origin: 'origin',
    destination: 'destination',
    startDate: 'startDate',
    endDate: 'endDate',
    purpose: 'purpose',
    transport: 'transport',
    budget: 'budget',
    notes: 'notes'
  };

  function errorId(field: keyof TravelFormDraft): string | undefined {
    return draftStore.errors[field] ? `${field}-error` : undefined;
  }

  function updateText(field: keyof TravelFormDraft, event: Event): void {
    if (applicationStore.pendingPersistence) return;
    draftStore.setField(field, (event.currentTarget as HTMLInputElement).value as never);
  }

  function updateBudget(event: Event): void {
    if (applicationStore.pendingPersistence) return;
    const value = (event.currentTarget as HTMLInputElement).value;
    draftStore.setField('budget', value === '' ? null : Number(value));
  }

  function persistDraft(mode: 'draft' | 'submit') {
    const payload = { ...draftStore.draft };
    return draftStore.editingId
      ? applicationStore.update(draftStore.editingId, payload, mode)
      : applicationStore.create(payload, mode);
  }

  function validateOnBlur(): void {
    draftStore.validate();
  }

  function focusFirstError(): void {
    const firstField = Object.keys(draftStore.errors)[0] as keyof TravelFormDraft | undefined;
    if (firstField) document.getElementById(fieldIds[firstField])?.focus();
  }

  async function saveDraft(): Promise<void> {
    if (applicationStore.pendingPersistence || !selectedApplicant) {
      if (applicationStore.pendingPersistence) return;
      draftStore.validate();
      focusFirstError();
      return;
    }

    const saved = persistDraft('draft');
    if (applicationStore.pendingPersistence) return;

    draftStore.clear();
    await navigate(appPath(`/applications/${saved.id}`));
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

  async function preview(): Promise<void> {
    if (Object.keys(draftStore.validate()).length > 0) {
      focusFirstError();
      return;
    }

    await navigate(appPath('/applications/preview'));
  }
</script>

<form class="flex flex-col gap-6" onsubmit={(event) => event.preventDefault()} novalidate>
  <fieldset
    disabled={applicationStore.pendingPersistence !== null}
    class="flex min-w-0 flex-col gap-6 border-0 p-0"
  >
  <section
    id="applicant"
    aria-labelledby="applicant-heading"
    class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
  >
    <h2 id="applicant-heading" class="text-lg font-semibold text-slate-950">申请人信息</h2>
    <p class="mt-1 text-sm text-slate-500">请选择本次出差申请人。</p>

    <div class="mt-6">
      <label for="applicantId" class="block text-sm font-medium text-slate-700">申请人</label>
      <SelectControl
        id="applicantId"
        class="mt-2"
        value={draftStore.draft.applicantId}
        aria-invalid={draftStore.errors.applicantId ? 'true' : undefined}
        aria-describedby={errorId('applicantId')}
        onchange={(event) => updateText('applicantId', event)}
        onblur={validateOnBlur}
      >
        <option value="">请选择申请人</option>
        {#each people.filter(({ role }) => role === 'applicant') as person (person.id)}
          <option value={person.id}>{person.name}</option>
        {/each}
      </SelectControl>
      {#if draftStore.errors.applicantId}
        <p id="applicantId-error" class="mt-2 text-sm text-red-600">
          {draftStore.errors.applicantId}
        </p>
      {/if}
    </div>

    {#if selectedApplicant}
      <dl class="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="text-slate-500">工号</dt>
          <dd class="mt-1 font-medium text-slate-900">{selectedApplicant.employeeNo}</dd>
        </div>
        <div>
          <dt class="text-slate-500">部门</dt>
          <dd class="mt-1 font-medium text-slate-900">{selectedApplicant.department}</dd>
        </div>
        <div>
          <dt class="text-slate-500">职位</dt>
          <dd class="mt-1 font-medium text-slate-900">{selectedApplicant.title}</dd>
        </div>
        <div>
          <dt class="text-slate-500">联系方式</dt>
          <dd class="mt-1 font-medium text-slate-900">{selectedApplicant.contact}</dd>
        </div>
      </dl>
    {/if}
  </section>

  <section
    id="travel"
    aria-labelledby="travel-heading"
    class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
  >
    <h2 id="travel-heading" class="text-lg font-semibold text-slate-950">行程信息</h2>
    <p class="mt-1 text-sm text-slate-500">填写出差安排与预计费用。</p>

    <div class="mt-6 grid gap-5 sm:grid-cols-2">
      <div>
        <label for="origin" class="block text-sm font-medium text-slate-700">出发地</label>
        <input
          id="origin"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.origin}
          aria-invalid={draftStore.errors.origin ? 'true' : undefined}
          aria-describedby={errorId('origin')}
          oninput={(event) => updateText('origin', event)}
          onblur={validateOnBlur}
        />
        {#if draftStore.errors.origin}<p id="origin-error" class="mt-2 text-sm text-red-600">{draftStore.errors.origin}</p>{/if}
      </div>
      <div>
        <label for="destination" class="block text-sm font-medium text-slate-700">目的地</label>
        <input
          id="destination"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.destination}
          aria-invalid={draftStore.errors.destination ? 'true' : undefined}
          aria-describedby={errorId('destination')}
          oninput={(event) => updateText('destination', event)}
          onblur={validateOnBlur}
        />
        {#if draftStore.errors.destination}<p id="destination-error" class="mt-2 text-sm text-red-600">{draftStore.errors.destination}</p>{/if}
      </div>
      <div>
        <label for="startDate" class="block text-sm font-medium text-slate-700">开始日期</label>
        <input
          id="startDate"
          type="date"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.startDate}
          aria-invalid={draftStore.errors.startDate ? 'true' : undefined}
          aria-describedby={errorId('startDate')}
          oninput={(event) => updateText('startDate', event)}
          onblur={validateOnBlur}
        />
        {#if draftStore.errors.startDate}<p id="startDate-error" class="mt-2 text-sm text-red-600">{draftStore.errors.startDate}</p>{/if}
      </div>
      <div>
        <label for="endDate" class="block text-sm font-medium text-slate-700">结束日期</label>
        <input
          id="endDate"
          type="date"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.endDate}
          aria-invalid={draftStore.errors.endDate ? 'true' : undefined}
          aria-describedby={errorId('endDate')}
          oninput={(event) => updateText('endDate', event)}
          onblur={validateOnBlur}
        />
        {#if draftStore.errors.endDate}<p id="endDate-error" class="mt-2 text-sm text-red-600">{draftStore.errors.endDate}</p>{/if}
      </div>
      <div class="sm:col-span-2">
        <label for="purpose" class="block text-sm font-medium text-slate-700">出差事由</label>
        <textarea
          id="purpose"
          rows="3"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.purpose}
          aria-invalid={draftStore.errors.purpose ? 'true' : undefined}
          aria-describedby={errorId('purpose')}
          oninput={(event) => updateText('purpose', event)}
          onblur={validateOnBlur}
        ></textarea>
        {#if draftStore.errors.purpose}<p id="purpose-error" class="mt-2 text-sm text-red-600">{draftStore.errors.purpose}</p>{/if}
      </div>
      <div>
        <label for="transport" class="block text-sm font-medium text-slate-700">交通方式</label>
        <SelectControl
          id="transport"
          class="mt-2"
          value={draftStore.draft.transport}
          aria-invalid={draftStore.errors.transport ? 'true' : undefined}
          aria-describedby={errorId('transport')}
          onchange={(event) => updateText('transport', event)}
          onblur={validateOnBlur}
        >
          <option value="">请选择交通方式</option>
          <option value="飞机">飞机</option>
          <option value="高铁">高铁</option>
          <option value="汽车">汽车</option>
          <option value="其他">其他</option>
        </SelectControl>
        {#if draftStore.errors.transport}<p id="transport-error" class="mt-2 text-sm text-red-600">{draftStore.errors.transport}</p>{/if}
      </div>
      <div>
        <label for="budget" class="block text-sm font-medium text-slate-700">预计预算（元）</label>
        <input
          id="budget"
          type="number"
          min="0"
          step="0.01"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.budget ?? ''}
          aria-invalid={draftStore.errors.budget ? 'true' : undefined}
          aria-describedby={errorId('budget')}
          oninput={updateBudget}
          onblur={validateOnBlur}
        />
        {#if draftStore.errors.budget}<p id="budget-error" class="mt-2 text-sm text-red-600">{draftStore.errors.budget}</p>{/if}
      </div>
      <div class="sm:col-span-2">
        <label for="notes" class="block text-sm font-medium text-slate-700">备注</label>
        <textarea
          id="notes"
          rows="3"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          value={draftStore.draft.notes}
          oninput={(event) => updateText('notes', event)}
        ></textarea>
      </div>
    </div>
  </section>
  </fieldset>

  {#if applicationStore.pendingPersistence}
    <div
      role="alert"
      class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
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

  <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
    <button
      type="button"
      disabled={applicationStore.pendingPersistence !== null}
      class="min-h-11 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
      onclick={saveDraft}
    >
      保存草稿
    </button>
    <button
      type="button"
      disabled={applicationStore.pendingPersistence !== null}
      class="min-h-11 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
      onclick={preview}
    >
      预览申请
    </button>
  </div>
</form>
