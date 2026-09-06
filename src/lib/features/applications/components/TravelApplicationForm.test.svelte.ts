import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { mockPeople } from '$lib/features/applications/data/mock';
import type { SaveResult } from '$lib/features/applications/data/repository';
import type { TravelApplication, TravelFormDraft } from '$lib/features/applications/domain/types';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import { createDraftStore } from '$lib/features/applications/state/draft-store.svelte';
import TravelApplicationForm from './TravelApplicationForm.svelte';

const validDraft: TravelFormDraft = {
  applicantId: 'p-alice',
  origin: '上海',
  destination: '北京',
  startDate: '2026-09-20',
  endDate: '2026-09-22',
  purpose: '客户拜访',
  transport: '高铁',
  budget: 3000,
  notes: '靠窗座位'
};

function setup(saveResults: SaveResult[] = [{ persisted: true }]) {
  const navigate = vi.fn();
  let lastWarning: string | null = null;
  const save = vi.fn(() => {
    const result = saveResults.shift() ?? { persisted: true };
    lastWarning = result.persisted ? null : (result.warning ?? null);
    return result;
  });
  const repository = {
    get lastWarning() {
      return lastWarning;
    },
    load: () => [] as TravelApplication[],
    save,
    reset: () => [] as TravelApplication[]
  };
  const applicationStore = createApplicationStore({
    repository,
    people: mockPeople,
    currentActor: () => mockPeople[0],
    createId: () => 'app-created',
    now: () => '2026-09-05T10:00:00.000Z'
  });
  const draftStore = createDraftStore({
    people: mockPeople,
    today: () => '2026-09-05'
  });

  render(TravelApplicationForm, {
    props: { draftStore, applicationStore, people: mockPeople, navigate }
  });

  return { applicationStore, draftStore, navigate, save };
}

async function fillValidForm() {
  await fireEvent.change(screen.getByLabelText('申请人'), {
    target: { value: validDraft.applicantId }
  });
  await fireEvent.input(screen.getByLabelText('出发地'), {
    target: { value: validDraft.origin }
  });
  await fireEvent.input(screen.getByLabelText('目的地'), {
    target: { value: validDraft.destination }
  });
  await fireEvent.input(screen.getByLabelText('开始日期'), {
    target: { value: validDraft.startDate }
  });
  await fireEvent.input(screen.getByLabelText('结束日期'), {
    target: { value: validDraft.endDate }
  });
  await fireEvent.input(screen.getByLabelText('出差事由'), {
    target: { value: validDraft.purpose }
  });
  await fireEvent.change(screen.getByLabelText('交通方式'), {
    target: { value: validDraft.transport }
  });
  await fireEvent.input(screen.getByLabelText('预计预算（元）'), {
    target: { value: String(validDraft.budget) }
  });
  await fireEvent.input(screen.getByLabelText('备注'), {
    target: { value: validDraft.notes }
  });
}

describe('TravelApplicationForm', () => {
  it('shows applicant details after selecting an applicant', async () => {
    setup();

    await fireEvent.change(screen.getByLabelText('申请人'), {
      target: { value: 'p-alice' }
    });

    expect(screen.getByText('RD001')).toBeInTheDocument();
    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.getByText('前端工程师')).toBeInTheDocument();
    expect(screen.getByText('13800138001')).toBeInTheDocument();
  });

  it('shows accessible field errors when previewing an empty form', async () => {
    setup();

    await fireEvent.click(screen.getByRole('button', { name: '预览申请' }));

    expect(document.getElementById('applicantId-error')).toHaveTextContent('请选择申请人');
    expect(screen.getByText('请输入出发地')).toBeInTheDocument();
    expect(screen.getByText('请输入目的地')).toBeInTheDocument();
    expect(screen.getByText('请选择开始日期')).toBeInTheDocument();
    expect(screen.getByText('请选择结束日期')).toBeInTheDocument();
    expect(screen.getByText('请输入出差事由')).toBeInTheDocument();
    expect(document.getElementById('transport-error')).toHaveTextContent('请选择交通方式');
    expect(screen.getByText('预计预算必须大于 0')).toBeInTheDocument();
    expect(screen.getByLabelText('申请人')).toHaveAttribute(
      'aria-describedby',
      'applicantId-error'
    );
    expect(screen.getByLabelText('申请人')).toHaveFocus();
  });

  it('saves a populated draft, clears the form, and opens its detail page', async () => {
    const { applicationStore, draftStore, navigate } = setup();
    const create = vi.spyOn(applicationStore, 'create');
    await fillValidForm();

    await fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    expect(create).toHaveBeenCalledWith(validDraft, 'draft');
    expect(draftStore.draft.applicantId).toBe('');
    expect(navigate).toHaveBeenCalledWith('/applications/app-created');
  });

  it('retains the draft and retries persistence without creating a duplicate', async () => {
    const warning = '保存失败，刷新后数据可能丢失';
    const { applicationStore, draftStore, navigate } = setup([
      { persisted: false, warning },
      { persisted: true }
    ]);
    const create = vi.spyOn(applicationStore, 'create');
    await fillValidForm();

    await fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    expect(screen.getByRole('alert')).toHaveTextContent(warning);
    expect(draftStore.draft).toEqual(validDraft);
    expect(applicationStore.applications).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '保存草稿' })).toBeDisabled();
    expect(screen.getByLabelText('申请人')).toBeDisabled();
    expect(screen.getByLabelText('出发地')).toBeDisabled();
    expect(screen.getByLabelText('备注')).toBeDisabled();

    await fireEvent.input(screen.getByLabelText('出发地'), {
      target: { value: '杭州' }
    });

    expect(draftStore.draft.origin).toBe(validDraft.origin);
    expect(applicationStore.applications[0].travel.origin).toBe(validDraft.origin);

    await fireEvent.click(screen.getByRole('button', { name: '重试保存' }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(applicationStore.applications).toHaveLength(1);
    expect(draftStore.draft.applicantId).toBe('');
    expect(navigate).toHaveBeenCalledWith('/applications/app-created');
  });

  it('saves edits to the original draft instead of creating another application', async () => {
    const { applicationStore, draftStore, navigate } = setup();
    const created = applicationStore.create(validDraft, 'draft');
    draftStore.load(created);
    await tick();
    const create = vi.spyOn(applicationStore, 'create');
    const update = vi.spyOn(applicationStore, 'update');

    await fireEvent.input(screen.getByLabelText('目的地'), { target: { value: '杭州' } });
    await fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      created.id,
      { ...validDraft, destination: '杭州' },
      'draft'
    );
    expect(applicationStore.applications).toHaveLength(1);
    expect(applicationStore.applications[0].travel.destination).toBe('杭州');
    expect(draftStore.draft.applicantId).toBe('');
    expect(navigate).toHaveBeenCalledWith(`/applications/${created.id}`);
  });

  it('keeps a valid draft and navigates to preview', async () => {
    const { draftStore, navigate } = setup();
    await fillValidForm();

    await fireEvent.click(screen.getByRole('button', { name: '预览申请' }));

    expect(draftStore.draft).toEqual(validDraft);
    expect(navigate).toHaveBeenCalledWith('/applications/preview');
  });
});
