<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description,
    action
  }: {
    title: string;
    description: string;
    action?: Snippet;
  } = $props();
</script>

<section
  class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center sm:px-10"
  role="status"
>
  <div
    class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500"
    aria-hidden="true"
  >
    ◇
  </div>
  <h2 class="mt-4 text-base font-semibold text-slate-900">{title}</h2>
  <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
  {#if action}
    <div class="mt-5">
      {@render action()}
    </div>
  {/if}
</section>
