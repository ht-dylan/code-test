import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.svelte';

describe('AppShell', () => {
  it('renders all primary navigation entries', () => {
    render(AppShell, { props: { currentPath: '/' } });
    expect(screen.getByRole('link', { name: '工作台' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '发起申请' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '申请列表' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '统计报表' })).toBeInTheDocument();
  });

  it('announces a repository warning in the polite live region', () => {
    render(AppShell, { props: { currentPath: '/', warning: '保存失败，刷新后数据可能丢失' } });

    expect(screen.getByTestId('toast-region')).toHaveTextContent('保存失败，刷新后数据可能丢失');
  });

  it('dismisses the repository warning', async () => {
    render(AppShell, { props: { currentPath: '/', warning: '无法读取本地数据，已使用演示数据' } });

    await fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));

    expect(screen.getByTestId('toast-region')).not.toHaveTextContent(
      '无法读取本地数据，已使用演示数据'
    );
  });

  it('hides the demo reset action until the user menu is opened', async () => {
    render(AppShell, { props: { currentPath: '/' } });

    expect(screen.queryByRole('button', { name: '重置演示数据' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));

    expect(screen.getByRole('button', { name: '重置演示数据' })).toBeInTheDocument();
  });

  it('requires confirmation before resetting demo data', async () => {
    const onreset = vi.fn();
    render(AppShell, { props: { currentPath: '/', onreset } });

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await fireEvent.click(screen.getByRole('button', { name: '重置演示数据' }));

    expect(screen.getByRole('heading', { name: '确认重置演示数据' })).toBeInTheDocument();
    expect(onreset).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: '确认重置' }));

    expect(onreset).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('toast-region')).toHaveTextContent('演示数据已重置');
  });

  it('keeps announcing a persistence warning instead of the reset notice', async () => {
    render(AppShell, {
      props: { currentPath: '/', warning: '保存失败，刷新后数据可能丢失', onreset: vi.fn() }
    });

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await fireEvent.click(screen.getByRole('button', { name: '重置演示数据' }));
    await fireEvent.click(screen.getByRole('button', { name: '确认重置' }));

    expect(screen.getByTestId('toast-region')).toHaveTextContent('保存失败，刷新后数据可能丢失');
    expect(screen.getByTestId('toast-region')).not.toHaveTextContent('演示数据已重置');

    await fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));

    expect(screen.getByTestId('toast-region')).not.toHaveTextContent('演示数据已重置');
  });

  it('focuses the cancel action when the reset dialog opens', async () => {
    render(AppShell, { props: { currentPath: '/', onreset: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await fireEvent.click(screen.getByRole('button', { name: '重置演示数据' }));

    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
  });

  it('closes the reset dialog on Escape without resetting', async () => {
    const onreset = vi.fn();
    render(AppShell, { props: { currentPath: '/', onreset } });

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await fireEvent.click(screen.getByRole('button', { name: '重置演示数据' }));
    await fireEvent.keyDown(screen.getByRole('button', { name: '取消' }), { key: 'Escape' });

    expect(screen.queryByRole('heading', { name: '确认重置演示数据' })).not.toBeInTheDocument();
    expect(onreset).not.toHaveBeenCalled();
  });

  it('restores keyboard focus to the user menu after closing the reset dialog', async () => {
    render(AppShell, { props: { currentPath: '/' } });

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await fireEvent.click(screen.getByRole('button', { name: '重置演示数据' }));
    await fireEvent.keyDown(screen.getByRole('button', { name: '取消' }), { key: 'Escape' });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '用户菜单' }));
  });
});
