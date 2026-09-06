import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import ApplicationFilters from './ApplicationFilters.svelte';

describe('ApplicationFilters', () => {
  it('emits one typed filter value containing every current field', async () => {
    const onfilter = vi.fn();
    render(ApplicationFilters, { props: { onfilter } });

    await fireEvent.input(screen.getByLabelText('搜索申请'), {
      target: { value: '上海' }
    });
    await fireEvent.change(screen.getByLabelText('申请状态'), {
      target: { value: 'pending_manager' }
    });
    await fireEvent.input(screen.getByLabelText('开始日期'), {
      target: { value: '2026-09-01' }
    });
    await fireEvent.input(screen.getByLabelText('结束日期'), {
      target: { value: '2026-09-30' }
    });

    expect(onfilter).toHaveBeenLastCalledWith({
      keyword: '上海',
      status: 'pending_manager',
      startDate: '2026-09-01',
      endDate: '2026-09-30'
    });
  });

  it('clears every field and emits the empty filter', async () => {
    const onfilter = vi.fn();
    render(ApplicationFilters, { props: { onfilter } });
    await fireEvent.input(screen.getByLabelText('搜索申请'), {
      target: { value: 'app' }
    });
    await fireEvent.change(screen.getByLabelText('申请状态'), {
      target: { value: 'approved' }
    });

    await fireEvent.click(screen.getByRole('button', { name: '清除筛选' }));

    expect(screen.getByLabelText('搜索申请')).toHaveValue('');
    expect(screen.getByLabelText('申请状态')).toHaveValue('');
    expect(onfilter).toHaveBeenLastCalledWith({
      keyword: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  });
});
