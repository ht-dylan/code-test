import { render } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EChart, { type EChartsOption } from './EChart.svelte';

const mocks = vi.hoisted(() => {
  const chart = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn()
  };
  return {
    chart,
    init: vi.fn(() => chart),
    use: vi.fn(),
    modules: {
      PieChart: Symbol('PieChart'),
      BarChart: Symbol('BarChart'),
      LineChart: Symbol('LineChart'),
      TooltipComponent: Symbol('TooltipComponent'),
      LegendComponent: Symbol('LegendComponent'),
      GridComponent: Symbol('GridComponent'),
      CanvasRenderer: Symbol('CanvasRenderer')
    }
  };
});

vi.mock('echarts/core', () => ({ init: mocks.init, use: mocks.use }));
vi.mock('echarts/charts', () => ({
  PieChart: mocks.modules.PieChart,
  BarChart: mocks.modules.BarChart,
  LineChart: mocks.modules.LineChart
}));
vi.mock('echarts/components', () => ({
  TooltipComponent: mocks.modules.TooltipComponent,
  LegendComponent: mocks.modules.LegendComponent,
  GridComponent: mocks.modules.GridComponent
}));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: mocks.modules.CanvasRenderer }));

describe('EChart', () => {
  beforeEach(() => {
    mocks.init.mockClear();
    mocks.use.mockClear();
    mocks.chart.setOption.mockClear();
    mocks.chart.resize.mockClear();
    mocks.chart.dispose.mockClear();
  });

  it('registers the exact modular ECharts collection once', async () => {
    vi.resetModules();
    const { registeredModules } = await import('./echarts');

    expect(registeredModules).toEqual([
      mocks.modules.PieChart,
      mocks.modules.BarChart,
      mocks.modules.LineChart,
      mocks.modules.TooltipComponent,
      mocks.modules.LegendComponent,
      mocks.modules.GridComponent,
      mocks.modules.CanvasRenderer
    ]);
    expect(mocks.use).toHaveBeenCalledOnce();
    expect(mocks.use).toHaveBeenCalledWith([...registeredModules]);
  });

  it('initializes, updates, resizes, and disposes the chart lifecycle', async () => {
    let resizeCallback: ResizeObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      }
    );
    const option: EChartsOption = { series: [{ type: 'pie', data: [1] }] };
    const view = render(EChart, { props: { option, label: '申请状态图' } });

    expect(mocks.init).toHaveBeenCalledOnce();
    expect(mocks.chart.setOption).toHaveBeenCalledWith(option, true);
    expect(view.getByRole('img', { name: '申请状态图' })).toHaveStyle({ minHeight: '320px' });

    resizeCallback([], {} as ResizeObserver);
    expect(mocks.chart.resize).toHaveBeenCalled();

    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(mocks.chart.dispose).toHaveBeenCalledOnce();
  });
});
