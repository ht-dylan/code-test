import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { ApprovalRecord } from '$lib/features/applications/domain/types';
import ApprovalTimeline from './ApprovalTimeline.svelte';

describe('ApprovalTimeline', () => {
  const approval: ApprovalRecord = {
    id: 'approval-1',
    actorId: 'p-manager',
    actorName: '王经理',
    actorRole: 'manager',
    action: 'approve',
    from: 'pending_manager',
    to: 'pending_finance',
    comment: '同意本次出差',
    createdAt: '2026-09-05T08:30:00.000Z'
  };

  it('renders approval details as a chronological ordered list', () => {
    const { container } = render(ApprovalTimeline, { props: { approvals: [approval] } });

    expect(screen.getByRole('list')).toHaveProperty('tagName', 'OL');
    expect(screen.getByText('王经理')).toBeInTheDocument();
    expect(screen.getByText('主管')).toBeInTheDocument();
    expect(screen.getByText('通过')).toBeInTheDocument();
    expect(screen.getByText('同意本次出差')).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveAttribute('datetime', approval.createdAt);
    expect(container.querySelector('time')).not.toBeEmptyDOMElement();
  });
});
