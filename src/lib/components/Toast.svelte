<script lang="ts">
  let {
    message,
    tone = 'warning',
    ondismiss
  }: {
    message: string | null;
    tone?: 'warning' | 'success';
    ondismiss?: () => void;
  } = $props();
</script>

<div
  data-testid="toast-region"
  aria-live="polite"
  class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:bottom-6"
>
  {#if message}
    <div
      class:border-amber-300={tone === 'warning'}
      class:bg-amber-50={tone === 'warning'}
      class:text-amber-900={tone === 'warning'}
      class:border-teal-300={tone === 'success'}
      class:bg-teal-50={tone === 'success'}
      class:text-teal-900={tone === 'success'}
      class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg"
    >
      <p class="min-w-0 flex-1 leading-6">{message}</p>
      {#if ondismiss}
        <button
          type="button"
          aria-label="关闭提示"
          onclick={ondismiss}
          class="min-h-11 shrink-0 rounded-lg px-2 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          关闭
        </button>
      {/if}
    </div>
  {/if}
</div>
