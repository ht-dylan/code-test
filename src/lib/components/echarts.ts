import { BarChart, LineChart, PieChart } from 'echarts/charts';
import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption
} from 'echarts/components';
import { init, use } from 'echarts/core';
import type { ComposeOption, ECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

export const registeredModules = [
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
] as const;

use([...registeredModules]);

export { init };
export type { ECharts };
export type EChartsOption = ComposeOption<
  | PieSeriesOption
  | BarSeriesOption
  | LineSeriesOption
  | TooltipComponentOption
  | LegendComponentOption
  | GridComponentOption
>;
