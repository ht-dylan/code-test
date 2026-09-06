import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { mockPeople, seedApplications } from '$lib/features/applications/data/mock';
import type { SaveResult } from '$lib/features/applications/data/repository';
import type { TravelApplication } from '$lib/features/applications/domain/types';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import { createRoleState } from '$lib/features/applications/state/role-state.svelte';
import ApplicationDetailPage from './+page.svelte';

function setup(
  application: TravelApplication,
  saveResults: SaveResult[] = [{ persisted: true }],
  applicationId = application.id
) {
  const save = vi.fn((): SaveResult => saveResults.shift() ?? { persisted: true });
  const roleState = createRoleState(mockPeople);
  const applicationStore = createApplicationStore({
    repository: {
      lastWarning: null,
      load: () => [application],
      save,
      reset: () => []
    },
    people: mockPeople,
    currentActor: () => roleState.currentPerson,
    createId: () => 'unused',
    now: () => '2026-09-05T11:00:00.000Z'
  });
  applicationStore.initialize();
  const view = render(ApplicationDetailPage, {
    props: {
      applicationId,
      applicationStore,
      roleState,
      people: mockPeople
    }
  });
  return { applicationStore, roleState, save, view };
}

describe('application detail page', () => {
  it('renders not found when the ID does not exist', () => {
    setup(seedApplications[0], [{ persisted: true }], 'missing');

    expect(screen.getByText('未找到该申请')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回申请列表' })).toHaveAttribute(
      'href',
      '/applications'
    );
  });

  it('renders the shared summary, timeline, and persisted draft action', () => {
    const draft = seedApplications.find(({ status }) => status === 'draft') as TravelApplication;
    setup(draft);

    expect(screen.getByRole('heading', { name: '申请详情' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '申请信息' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '审批记录' })).toBeInTheDocument();
    expect(screen.getByText(draft.applicant.name)).toBeInTheDocument();
    expect(screen.getByText('暂无审批记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交申请' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '继续编辑' })).toHaveAttribute(
      'href',
      `/applications/${draft.id}/edit`
    );
  });

  it('hides continue editing when the current role does not own the draft', async () => {
    const draft = seedApplications.find(({ status }) => status === 'draft') as TravelApplication;
    setup(draft);

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-manager' }
    });

    expect(screen.queryByRole('link', { name: '继续编辑' })).not.toBeInTheDocument();
  });

  it('rejects submitting an incomplete draft and shows Chinese field errors', async () => {
    const incomplete: TravelApplication = {
      id: 'app-empty',
      applicant: mockPeople[0],
      travel: {
        origin: '',
        destination: '',
        startDate: '',
        endDate: '',
        purpose: '',
        transport: '',
        budget: null,
        notes: ''
      },
      status: 'draft',
      createdAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
      approvals: []
    };
    const { applicationStore } = setup(incomplete);

    await fireEvent.click(screen.getByRole('button', { name: '提交申请' }));

    expect(applicationStore.applications[0].status).toBe('draft');
    expect(screen.getByText('请输入出发地')).toBeInTheDocument();
    expect(screen.getByText('请输入目的地')).toBeInTheDocument();
    expect(screen.getByText('预计预算必须大于 0')).toBeInTheDocument();
  });

  it('switches roles and performs an approval through applicationStore', async () => {
    const pending = seedApplications.find(
      ({ status }) => status === 'pending_manager'
    ) as TravelApplication;
    const { applicationStore } = setup(pending);
    const act = vi.spyOn(applicationStore, 'act');

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-manager' }
    });
    await fireEvent.click(screen.getByRole('button', { name: '通过申请' }));
    await fireEvent.click(screen.getByRole('button', { name: '确认通过' }));

    expect(act).toHaveBeenCalledWith(pending.id, 'approve', '');
    expect(applicationStore.applications[0].status).toBe('pending_finance');
    expect(screen.getByText('王经理')).toBeInTheDocument();
  });

  it('uses centralized pending-persistence recovery after an action save fails', async () => {
    const pending = seedApplications.find(
      ({ status }) => status === 'pending_manager'
    ) as TravelApplication;
    setup(pending, [
      { persisted: false, warning: '保存失败，刷新后数据可能丢失' },
      { persisted: true }
    ]);

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-manager' }
    });
    await fireEvent.click(screen.getByRole('button', { name: '通过申请' }));
    await fireEvent.click(screen.getByRole('button', { name: '确认通过' }));

    expect(screen.getByRole('alert')).toHaveTextContent('保存失败，刷新后数据可能丢失');
    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-finance' }
    });
    expect(screen.getByRole('button', { name: '通过申请' })).toBeDisabled();

    await fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '通过申请' })).toBeEnabled();
  });
});
