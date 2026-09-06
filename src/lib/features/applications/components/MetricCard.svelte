<script lang="ts">
  let {
    label,
    value,
    hint,
    tone = 'teal'
  }: {
    label: string;
    value: string;
    hint?: string;
    tone?: 'teal' | 'blue';
  } = $props();
</script>

<article
  data-testid="metric-card"
  class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
>
  <span
    aria-hidden="true"
    class:bg-teal-500={tone === 'teal'}
    class:bg-blue-700={tone === 'blue'}
    class="absolute inset-y-0 left-0 w-1"
  ></span>
  <p class="text-sm font-medium text-slate-500">{label}</p>
  <p class="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
  {#if hint}
    <p class="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
  {/if}
</article>
