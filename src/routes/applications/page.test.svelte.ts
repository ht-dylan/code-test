import { fireEvent, render, screen, within } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { mockPeople, seedApplications } from '$lib/features/applications/data/mock';
import type { TravelApplication } from '$lib/features/applications/domain/types';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import { createRoleState } from '$lib/features/applications/state/role-state.svelte';
import ApplicationsPage from './+page.svelte';

function renderPage(applications: TravelApplication[]) {
  const roleState = createRoleState(mockPeople);
  const applicationStore = createApplicationStore({
    repository: {
      lastWarning: null,
      load: () => applications,
      save: () => ({ persisted: true }),
      reset: () => []
    },
    people: mockPeople,
    currentActor: () => roleState.currentPerson,
    createId: () => 'unused',
    now: () => '2026-09-05T10:00:00.000Z'
  });
  applicationStore.initialize();
  return render(ApplicationsPage, {
    props: { applicationStore, roleState, people: mockPeople }
  });
}

describe('applications list page', () => {
  it('shows every required application summary field', () => {
    renderPage([seedApplications[0]]);

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('app-001')).toBeInTheDocument();
    expect(within(item).getByText('陈晓')).toBeInTheDocument();
    expect(within(item).getByText('北京')).toBeInTheDocument();
    expect(within(item).getByText('2026-04-20 至 2026-04-22')).toBeInTheDocument();
    expect(within(item).getByText('¥3,200.00')).toBeInTheDocument();
    expect(within(item).getByText('已通过')).toBeInTheDocument();
    expect(within(item).getByText('2026/04/08 16:00')).toBeInTheDocument();
  });

  it('filters case-insensitively across ID, applicant, and destination', async () => {
    renderPage(seedApplications.slice(0, 3));
    await fireEvent.click(screen.getByLabelText('查看全部申请'));
    const search = screen.getByLabelText('搜索申请');

    await fireEvent.input(search, { target: { value: 'APP-001' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('北京')).toBeInTheDocument();

    await fireEvent.input(search, { target: { value: '林悦' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('广州')).toBeInTheDocument();

    await fireEvent.input(search, { target: { value: '杭州' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('周航')).toBeInTheDocument();
  });

  it('applies status and date bounds and restores results when cleared', async () => {
    renderPage(seedApplications);
    await fireEvent.click(screen.getByLabelText('查看全部申请'));

    await fireEvent.change(screen.getByLabelText('申请状态'), {
      target: { value: 'pending_manager' }
    });
    await fireEvent.input(screen.getByLabelText('开始日期'), {
      target: { value: '2026-09-01' }
    });
    await fireEvent.input(screen.getByLabelText('结束日期'), {
      target: { value: '2026-09-30' }
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('武汉')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(seedApplications.length);
  });

  it('defaults the applicant list to their own applications', () => {
    renderPage(seedApplications);

    const ids = screen.getAllByRole('listitem').map((item) => within(item).getByText(/app-/).textContent);
    expect(ids).toEqual(['app-007', 'app-004', 'app-001']);
    expect(screen.queryByText('app-005')).not.toBeInTheDocument();
    expect(screen.queryByText('app-008')).not.toBeInTheDocument();
  });

  it('defaults the manager list to pending manager work and their own applications', async () => {
    renderPage(seedApplications);

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-manager' }
    });

    const ids = screen.getAllByRole('listitem').map((item) => within(item).getByText(/app-/).textContent);
    expect(ids).toEqual(['app-008', 'app-005']);
    expect(screen.queryByText('app-001')).not.toBeInTheDocument();
    expect(screen.queryByText('app-004')).not.toBeInTheDocument();
  });

  it('defaults the finance list to pending finance work and their own applications', async () => {
    renderPage(seedApplications);

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-finance' }
    });

    const ids = screen.getAllByRole('listitem').map((item) => within(item).getByText(/app-/).textContent);
    expect(ids).toEqual(['app-004']);
    expect(screen.queryByText('app-008')).not.toBeInTheDocument();
    expect(screen.queryByText('app-001')).not.toBeInTheDocument();
  });

  it('shows every application when 查看全部申请 is enabled and restores the role filter when cleared', async () => {
    renderPage(seedApplications);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    await fireEvent.click(screen.getByLabelText('查看全部申请'));
    expect(screen.getAllByRole('listitem')).toHaveLength(seedApplications.length);
    expect(screen.getByText('app-005')).toBeInTheDocument();
    expect(screen.getByText('app-008')).toBeInTheDocument();

    await fireEvent.click(screen.getByLabelText('查看全部申请'));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByText('app-005')).not.toBeInTheDocument();
  });

  it('distinguishes an empty repository from zero filter matches', async () => {
    const empty = renderPage([]);
    expect(screen.getByText('暂无申请记录')).toBeInTheDocument();
    empty.unmount();

    renderPage(seedApplications);
    await fireEvent.input(screen.getByLabelText('搜索申请'), {
      target: { value: '不存在的目的地' }
    });

    expect(screen.getByText('没有符合筛选条件的申请')).toBeInTheDocument();
    expect(screen.queryByText('暂无申请记录')).not.toBeInTheDocument();
  });
});
