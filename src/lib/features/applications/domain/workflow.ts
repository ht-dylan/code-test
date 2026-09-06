import type {
  ApplicationStatus,
  ApprovalRecord,
  Person,
  TravelApplication,
  WorkflowAction
} from './types';

const targets: Record<
  ApplicationStatus,
  Partial<Record<WorkflowAction, ApplicationStatus>>
> = {
  draft: { submit: 'pending_manager' },
  pending_manager: {
    approve: 'pending_finance',
    reject: 'rejected',
    withdraw: 'withdrawn'
  },
  pending_finance: { approve: 'approved', reject: 'rejected' },
  approved: {},
  rejected: {},
  withdrawn: {}
};

export function allowedActions(
  application: TravelApplication,
  actor: Person
): WorkflowAction[] {
  const ownsApplication =
    actor.role === 'applicant' && actor.id === application.applicant.id;

  if (application.status === 'draft' && ownsApplication) {
    return ['submit'];
  }

  if (application.status === 'pending_manager') {
    if (actor.role === 'manager') return ['approve', 'reject'];
    if (ownsApplication) return ['withdraw'];
  }

  if (application.status === 'pending_finance' && actor.role === 'finance') {
    return ['approve', 'reject'];
  }

  return [];
}

export function transition(
  application: TravelApplication,
  action: WorkflowAction,
  actor: Person,
  comment = '',
  now?: string
): TravelApplication {
  if (!allowedActions(application, actor).includes(action)) {
    throw new Error('当前角色无权执行此操作');
  }

  const trimmedComment = comment.trim();
  if (action === 'reject' && !trimmedComment) {
    throw new Error('驳回原因不能为空');
  }

  const target = targets[application.status][action];
  if (!target) {
    throw new Error('当前状态不允许执行此操作');
  }

  const occurredAt = now ?? new Date().toISOString();
  const approval: ApprovalRecord = {
    id: `${application.id}-approval-${application.approvals.length + 1}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    from: application.status,
    to: target,
    comment: trimmedComment,
    createdAt: occurredAt
  };

  return {
    ...application,
    status: target,
    updatedAt: occurredAt,
    approvals: [...application.approvals, approval]
  };
}
