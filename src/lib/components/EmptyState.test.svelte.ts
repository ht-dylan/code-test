import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
  it('announces its title and description', () => {
    render(EmptyState, {
      props: {
        title: '暂无申请',
        description: '发起申请后，记录会显示在这里。'
      }
    });

    expect(screen.getByRole('status')).toHaveTextContent('暂无申请');
    expect(screen.getByRole('status')).toHaveTextContent('发起申请后，记录会显示在这里。');
  });

  it('renders an optional action snippet', () => {
    const action = createRawSnippet(() => ({
      render: () => '<a href="/applications/new">发起申请</a>'
    }));

    render(EmptyState, {
      props: {
        title: '暂无申请',
        description: '当前没有申请记录。',
        action
      }
    });

    expect(screen.getByRole('link', { name: '发起申请' })).toHaveAttribute(
      'href',
      '/applications/new'
    );
  });
});
