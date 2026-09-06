import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { mockPeople } from '$lib/features/applications/data/mock';
import type { SaveResult } from '$lib/features/applications/data/repository';
import type { TravelApplication, TravelFormDraft } from '$lib/features/applications/domain/types';
import TravelApplicationForm from '$lib/features/applications/components/TravelApplicationForm.svelte';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import { createDraftStore } from '$lib/features/applications/state/draft-store.svelte';
import PreviewPage from './+page.svelte';

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

function setup(
  populated = true,
  saveResults: SaveResult[] = [{ persisted: true }]
) {
  const navigate = vi.fn(() => Promise.resolve());
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
    createId: () => 'app-submitted',
    now: () => '2026-09-05T10:00:00.000Z'
  });
  const draftStore = createDraftStore({
    people: mockPeople,
    today: () => '2026-09-05'
  });
  if (populated) {
    for (const [field, value] of Object.entries(validDraft)) {
      draftStore.setField(field as keyof TravelFormDraft, value as never);
    }
  }

  const view = render(PreviewPage, {
    props: {
      draftStore,
      applicationStore,
      people: mockPeople,
      navigate,
      validationDate: '2026-09-05'
    }
  });
  return { applicationStore, draftStore, navigate, view };
}

describe('application preview page', () => {
  it('renders applicant and travel summaries with section edit links', () => {
    setup();

    expect(screen.getByRole('heading', { name: '申请人信息' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '行程信息' })).toBeInTheDocument();
    expect(screen.getByText('陈晓')).toBeInTheDocument();
    expect(screen.getByText('RD001')).toBeInTheDocument();
    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.getByText('前端工程师')).toBeInTheDocument();
    expect(screen.getByText('13800138001')).toBeInTheDocument();
    expect(screen.getByText('上海 → 北京')).toBeInTheDocument();
    expect(screen.getByText('2026-09-20 至 2026-09-22')).toBeInTheDocument();
    expect(screen.getByText('客户拜访')).toBeInTheDocument();
    expect(screen.getByText('高铁')).toBeInTheDocument();
    expect(screen.getByText('¥3,000.00')).toBeInTheDocument();
    expect(screen.getByText('靠窗座位')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '编辑申请人信息' })).toHaveAttribute(
      'href',
      '/applications/new#applicant'
    );
    expect(screen.getByRole('link', { name: '编辑行程信息' })).toHaveAttribute(
      'href',
      '/applications/new#travel'
    );
  });

  it('submits once, clears the draft, and opens the new detail page', async () => {
    const { applicationStore, draftStore, navigate } = setup();
    const create = vi.spyOn(applicationStore, 'create');
    const confirmButton = screen.getByRole('button', { name: '确认提交' });

    await Promise.all([fireEvent.click(confirmButton), fireEvent.click(confirmButton)]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(validDraft, 'submit');
    expect(draftStore.draft.applicantId).toBe('');
    expect(navigate).toHaveBeenCalledWith('/applications/app-submitted');
  });

  it('retains the draft and retries failed submission persistence without duplication', async () => {
    const warning = '保存失败，刷新后数据可能丢失';
    const { applicationStore, draftStore, navigate, view } = setup(true, [
      { persisted: false, warning },
      { persisted: true }
    ]);
    const create = vi.spyOn(applicationStore, 'create');

    await fireEvent.click(screen.getByRole('button', { name: '确认提交' }));

    expect(screen.getByRole('alert')).toHaveTextContent(warning);
    expect(draftStore.draft).toEqual(validDraft);
    expect(applicationStore.applications).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '确认提交' })).toBeDisabled();
    expect(screen.getByText('编辑申请人信息')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('编辑申请人信息')).not.toHaveAttribute('href');
    expect(screen.getByText('编辑行程信息')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('返回修改')).toHaveAttribute('aria-disabled', 'true');

    view.unmount();
    render(TravelApplicationForm, {
      props: { draftStore, applicationStore, people: mockPeople, navigate }
    });

    expect(screen.getByRole('alert')).toHaveTextContent(warning);
    expect(screen.getByLabelText('出发地')).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(create).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('button', { name: '重试保存' }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(applicationStore.applications).toHaveLength(1);
    expect(draftStore.draft.applicantId).toBe('');
    expect(navigate).toHaveBeenCalledWith('/applications/app-submitted');
  });

  it('shows an empty state when the draft cannot be previewed', () => {
    setup(false);

    expect(screen.getByText('暂无可预览的申请')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回填写申请' })).toHaveAttribute(
      'href',
      '/applications/new'
    );
    expect(screen.queryByRole('button', { name: '确认提交' })).not.toBeInTheDocument();
  });
});
