<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  let {
    class: className = '',
    children,
    value = $bindable(),
    ...rest
  }: HTMLSelectAttributes & { children: Snippet } = $props();
</script>

<div class={['relative', className]}>
  <select
    {...rest}
    bind:value
    class="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition hover:border-teal-300 hover:bg-white focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-red-400 aria-invalid:focus:ring-red-200"
  >
    {@render children()}
  </select>
  <svg
    class="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 6.5 8 10.5 12 6.5"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</div>
