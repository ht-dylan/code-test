import { fireEvent, render, screen, within } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPeople, seedApplications } from '$lib/features/applications/data/mock';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import { createRoleState } from '$lib/features/applications/state/role-state.svelte';
import DashboardPage from './+page.svelte';

vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: vi.fn(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() }))
}));

describe('dashboard page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
  });

  it('shows role-aware metrics, recent applications, and status chart', async () => {
    const roleState = createRoleState(mockPeople);
    const applicationStore = createApplicationStore({
      repository: {
        lastWarning: null,
        load: () => seedApplications,
        save: () => ({ persisted: true }),
        reset: () => []
      },
      people: mockPeople,
      currentActor: () => roleState.currentPerson,
      createId: () => 'unused',
      now: () => '2026-09-05T10:00:00.000Z'
    });
    applicationStore.initialize();

    render(DashboardPage, {
      props: {
        applicationStore,
        roleState,
        people: mockPeople,
        now: new Date('2026-09-05T10:00:00.000Z')
      }
    });

    const pendingMetric = screen.getByTestId('pending-metric');
    expect(within(pendingMetric).getByText('0')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('¥4,400.00')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '工作台申请状态分布图' })).toBeInTheDocument();

    const recentItems = screen.getAllByTestId('recent-application');
    expect(recentItems).toHaveLength(5);
    expect(within(recentItems[0]).getByText('app-008')).toBeInTheDocument();

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-manager' }
    });
    expect(within(pendingMetric).getByText('2')).toBeInTheDocument();
  });
});
