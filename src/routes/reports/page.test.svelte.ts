import { render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPeople, seedApplications } from '$lib/features/applications/data/mock';
import type { TravelApplication } from '$lib/features/applications/domain/types';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import ReportPage from './+page.svelte';

const echartsMock = vi.hoisted(() => {
  const options = new Map<string, unknown>();
  return {
    options,
    init: vi.fn((element: HTMLElement) => ({
      setOption: vi.fn((option: unknown) => options.set(element.getAttribute('aria-label') ?? '', option)),
      resize: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

vi.mock('echarts/core', () => ({ init: echartsMock.init, use: vi.fn() }));

function createStore(applications: TravelApplication[]) {
  const store = createApplicationStore({
    repository: {
      lastWarning: null,
      load: () => applications,
      save: () => ({ persisted: true }),
      reset: () => []
    },
    people: mockPeople,
    currentActor: () => mockPeople[0],
    createId: () => 'unused',
    now: () => '2026-09-05T10:00:00.000Z'
  });
  store.initialize();
  return store;
}

describe('reports page', () => {
  beforeEach(() => {
    echartsMock.options.clear();
    vi.clearAllMocks();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
  });

  it('renders four summaries and the required report series', async () => {
    render(ReportPage, {
      props: {
        applicationStore: createStore(seedApplications),
        now: new Date('2026-09-05T10:00:00.000Z')
      }
    });

    expect(screen.getAllByTestId('metric-card')).toHaveLength(4);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('¥22,900.00')).toBeInTheDocument();
    expect(screen.getByText('4.0 小时')).toBeInTheDocument();

    await waitFor(() => expect(echartsMock.options.size).toBe(3));
    const status = echartsMock.options.get('申请状态分布图') as {
      series: Array<{ name: string; type: string }>;
    };
    const trend = echartsMock.options.get('近六个月申请趋势图') as {
      xAxis: { data: string[] };
      series: Array<{ type: string }>;
    };
    const departments = echartsMock.options.get('部门预算分布图') as {
      yAxis: { type: string };
      series: Array<{ name: string; type: string }>;
    };

    expect(status.series).toContainEqual(expect.objectContaining({ name: '申请状态', type: 'pie' }));
    expect(trend.xAxis.data).toHaveLength(6);
    expect(trend.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'bar' }),
        expect.objectContaining({ type: 'line' })
      ])
    );
    expect(departments.yAxis.type).toBe('category');
    expect(departments.series).toContainEqual(
      expect.objectContaining({ name: '部门预算', type: 'bar' })
    );
  });

  it('emits valid zero-filled options and explains empty data', async () => {
    render(ReportPage, {
      props: {
        applicationStore: createStore([]),
        now: new Date('2026-09-05T10:00:00.000Z')
      }
    });

    expect(screen.getByText('暂无申请数据，图表将显示零值。')).toBeInTheDocument();
    await waitFor(() => expect(echartsMock.options.size).toBe(3));

    const status = echartsMock.options.get('申请状态分布图') as {
      series: Array<{ data: Array<{ value: number }> }>;
    };
    const trend = echartsMock.options.get('近六个月申请趋势图') as {
      series: Array<{ data: number[] }>;
    };
    const departments = echartsMock.options.get('部门预算分布图') as {
      series: Array<{ data: number[] }>;
    };

    expect(status.series[0].data).toHaveLength(6);
    expect(status.series[0].data.every(({ value }) => value === 0)).toBe(true);
    expect(trend.series.every(({ data }) => data.length === 6 && data.every((value) => value === 0))).toBe(
      true
    );
    expect(departments.series[0].data).toEqual([]);
  });
});
