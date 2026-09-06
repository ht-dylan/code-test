import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import Toast from './Toast.svelte';

describe('Toast', () => {
  it('keeps a polite live region even without a message', () => {
    render(Toast, { props: { message: null } });

    expect(screen.getByTestId('toast-region')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('button', { name: '关闭提示' })).not.toBeInTheDocument();
  });

  it('announces the message inside the live region', () => {
    render(Toast, { props: { message: '演示数据已重置' } });

    expect(screen.getByTestId('toast-region')).toHaveTextContent('演示数据已重置');
  });

  it('dismisses the message through the close button', async () => {
    const ondismiss = vi.fn();
    render(Toast, { props: { message: '本地数据异常，已恢复演示数据', ondismiss } });

    await fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));

    expect(ondismiss).toHaveBeenCalledTimes(1);
  });
});
