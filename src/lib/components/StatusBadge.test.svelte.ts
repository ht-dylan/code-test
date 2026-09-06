import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { ApplicationStatus } from '$lib/features/applications/domain/types';
import StatusBadge from './StatusBadge.svelte';

describe('StatusBadge', () => {
  const labels: Record<ApplicationStatus, string> = {
    draft: '草稿',
    pending_manager: '待主管审批',
    pending_finance: '待财务审批',
    approved: '已通过',
    rejected: '已驳回',
    withdrawn: '已撤回'
  };

  it.each(Object.entries(labels) as [ApplicationStatus, string][])(
    'renders the Chinese label for %s',
    (status, label) => {
      render(StatusBadge, { props: { status } });

      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );
});
