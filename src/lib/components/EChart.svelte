<script module lang="ts">
  export type { EChartsOption } from './echarts';
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { init, type ECharts, type EChartsOption } from './echarts';

  let {
    option,
    label,
    minHeight = 320
  }: {
    option: EChartsOption;
    label: string;
    minHeight?: number;
  } = $props();

  let container: HTMLDivElement;
  let chart = $state<ECharts>();

  $effect(() => {
    chart?.setOption(option, true);
  });

  onMount(() => {
    chart = init(container);
    const observer = new ResizeObserver(() => chart?.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart?.dispose();
      chart = undefined;
    };
  });
</script>

<div
  bind:this={container}
  role="img"
  aria-label={label}
  class="w-full"
  style:min-height={`${minHeight}px`}
></div>
