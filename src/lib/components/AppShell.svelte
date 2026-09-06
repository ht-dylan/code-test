<script lang="ts">
  import type { Snippet } from 'svelte';
  import { appPath, withoutBase } from '$lib/paths';
  import Toast from './Toast.svelte';

  let {
    currentPath,
    warning = null,
    onreset,
    children
  }: {
    currentPath: string;
    warning?: string | null;
    onreset?: () => void;
    children?: Snippet;
  } = $props();
  let menuOpen = $state(false);
  let userMenuOpen = $state(false);
  let confirmingReset = $state(false);
  let notice = $state<string | null>(null);
  let dismissedWarning = $state<string | null>(null);
  let userMenuButton = $state<HTMLButtonElement>();
  let resetDialog = $state<HTMLDialogElement>();
  let resetInitialFocus = $state<HTMLButtonElement>();

  const navigation = [
    { href: '/', label: '工作台' },
    { href: '/applications/new', label: '发起申请' },
    { href: '/applications', label: '申请列表' },
    { href: '/reports', label: '统计报表' }
  ];

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let visibleWarning = $derived(warning && warning !== dismissedWarning ? warning : null);
  let toastMessage = $derived(visibleWarning ?? notice);

  $effect(() => {
    if (confirmingReset && resetDialog && resetInitialFocus) {
      if (!resetDialog.open) resetDialog.showModal();
      resetInitialFocus.focus();
    }
  });

  function isActive(href: string) {
    const path = withoutBase(currentPath);
    if (href === '/') return path === href;
    if (href === '/applications') {
      return path === href || (path.startsWith(`${href}/`) && path !== '/applications/new');
    }
    return path === href || path.startsWith(`${href}/`);
  }

  function dismissToast(): void {
    if (visibleWarning) {
      dismissedWarning = warning;
      notice = null;
      return;
    }
    notice = null;
  }

  function openResetConfirmation(): void {
    userMenuOpen = false;
    confirmingReset = true;
  }

  function closeResetConfirmation(): void {
    resetDialog?.close();
    confirmingReset = false;
    userMenuButton?.focus();
  }

  function confirmReset(): void {
    closeResetConfirmation();
    onreset?.();
    dismissedWarning = null;
    if (warning) {
      notice = null;
      return;
    }
    notice = '演示数据已重置';
  }

  function handleDialogKeydown(event: KeyboardEvent): void {
    const dialog = resetDialog;
    if (!dialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeResetConfirmation();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1) as HTMLElement;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<div class="min-h-screen bg-[#f4f7fb]">
  <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
      <a
        class="rounded-lg text-xl font-bold tracking-tight text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        href={appPath('/')}
        aria-label="TripFlow 工作台"
      >
        <span class="text-teal-600">Trip</span>Flow
      </a>

      <nav
        aria-label="主导航"
        class:hidden={!menuOpen}
        class="absolute inset-x-0 top-16 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:static md:mr-auto md:flex md:border-0 md:bg-transparent md:p-0 md:shadow-none"
      >
        <div class="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
          {#each navigation as item}
            <a
              href={appPath(item.href)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              class:border-teal-500={isActive(item.href)}
              class:text-teal-700={isActive(item.href)}
              class="min-h-11 border-l-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 outline-none hover:bg-teal-50 hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500 md:border-l-0 md:border-b-2"
              onclick={() => (menuOpen = false)}
            >
              {item.label}
            </a>
          {/each}
        </div>
      </nav>

      <div class="flex items-center gap-2">
        <div class="relative">
          <button
            bind:this={userMenuButton}
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500"
            type="button"
            aria-label="用户菜单"
            aria-expanded={userMenuOpen}
            onclick={() => (userMenuOpen = !userMenuOpen)}
          >
            <span aria-hidden="true" class="text-lg">👤</span>
          </button>

          {#if userMenuOpen}
            <div
              class="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
            >
              <button
                type="button"
                onclick={openResetConfirmation}
                class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                重置演示数据
              </button>
            </div>
          {/if}
        </div>

        <button
          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 md:hidden"
          type="button"
          aria-label="切换导航菜单"
          aria-expanded={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
        >
          <span aria-hidden="true" class="text-xl">☰</span>
        </button>
      </div>
    </div>
  </header>

  <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    {#if children}
      {@render children()}
    {/if}
  </main>

  <Toast
    message={toastMessage}
    tone={visibleWarning ? 'warning' : 'success'}
    ondismiss={toastMessage ? dismissToast : undefined}
  />
</div>

{#if confirmingReset}
  <dialog
    bind:this={resetDialog}
    class="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-transparent p-0 backdrop:bg-slate-950/45"
    aria-modal="true"
    aria-labelledby="reset-demo-title"
    oncancel={(event) => {
      event.preventDefault();
      closeResetConfirmation();
    }}
    onkeydown={handleDialogKeydown}
  >
    <section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 id="reset-demo-title" class="text-lg font-semibold text-slate-950">确认重置演示数据</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        重置后，本地保存的申请将被替换为初始演示数据，且无法撤销。
      </p>
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          bind:this={resetInitialFocus}
          onclick={closeResetConfirmation}
          class="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          取消
        </button>
        <button
          type="button"
          onclick={confirmReset}
          class="min-h-11 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white outline-none hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          确认重置
        </button>
      </div>
    </section>
  </dialog>
{/if}
