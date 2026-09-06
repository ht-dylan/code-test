import { describe, expect, it } from 'vitest';
import type { Person, TravelApplication } from './types';
import { allowedActions, transition } from './workflow';

const applicant: Person = {
  id: 'applicant-1',
  employeeNo: 'E001',
  name: '张三',
  department: '产品部',
  title: '产品经理',
  contact: '13800138000',
  role: 'applicant'
};

const manager: Person = {
  id: 'manager-1',
  employeeNo: 'M001',
  name: '李经理',
  department: '产品部',
  title: '部门经理',
  contact: 'manager@example.com',
  role: 'manager'
};

const finance: Person = {
  id: 'finance-1',
  employeeNo: 'F001',
  name: '王会计',
  department: '财务部',
  title: '财务专员',
  contact: 'finance@example.com',
  role: 'finance'
};

const draftApplication: TravelApplication = {
  id: 'application-1',
  applicant,
  travel: {
    origin: '上海',
    destination: '北京',
    startDate: '2026-09-05',
    endDate: '2026-09-06',
    purpose: '客户拜访',
    transport: '高铁',
    budget: 1000,
    notes: ''
  },
  status: 'draft',
  createdAt: '2026-09-05T08:00:00.000Z',
  updatedAt: '2026-09-05T08:00:00.000Z',
  approvals: []
};

const managerPending: TravelApplication = {
  ...draftApplication,
  status: 'pending_manager'
};

const financePending: TravelApplication = {
  ...draftApplication,
  status: 'pending_finance'
};

describe('allowedActions', () => {
  it('allows an applicant to submit their own draft', () => {
    expect(allowedActions(draftApplication, applicant)).toEqual(['submit']);
  });

  it('allows a manager to approve or reject manager review', () => {
    expect(allowedActions(managerPending, manager)).toEqual(['approve', 'reject']);
  });

  it('allows an applicant to withdraw their own manager-pending application', () => {
    expect(allowedActions(managerPending, applicant)).toEqual(['withdraw']);
  });

  it('allows finance to approve or reject finance review', () => {
    expect(allowedActions(financePending, finance)).toEqual(['approve', 'reject']);
  });

  it('denies actions to the wrong applicant and on terminal applications', () => {
    const otherApplicant = { ...applicant, id: 'applicant-2' };

    expect(allowedActions(draftApplication, otherApplicant)).toEqual([]);
    expect(allowedActions({ ...draftApplication, status: 'approved' }, finance)).toEqual([]);
  });
});

describe('transition', () => {
  it('rejects actions unavailable to the actor', () => {
    expect(() => transition(managerPending, 'approve', finance)).toThrow(
      '当前角色无权执行此操作'
    );
  });

  it('requires a nonblank rejection reason', () => {
    expect(() => transition(managerPending, 'reject', manager, '  ')).toThrow(
      '驳回原因不能为空'
    );
  });

  it('uses a fresh ISO timestamp when now is omitted', () => {
    const beforeTransition = new Date().toISOString();

    const submitted = transition(draftApplication, 'submit', applicant);

    const afterTransition = new Date().toISOString();
    expect(submitted.updatedAt).toBe(submitted.approvals[0].createdAt);
    expect(new Date(submitted.updatedAt).toISOString()).toBe(submitted.updatedAt);
    expect(submitted.updatedAt > draftApplication.updatedAt).toBe(true);
    expect(submitted.updatedAt >= beforeTransition).toBe(true);
    expect(submitted.updatedAt <= afterTransition).toBe(true);
  });

  it('moves through the complete approval path with immutable approval records', () => {
    const submitted = transition(
      draftApplication,
      'submit',
      applicant,
      undefined,
      '2026-09-05T09:00:00.000Z'
    );
    const managerApproved = transition(
      submitted,
      'approve',
      manager,
      '同意',
      '2026-09-05T10:00:00.000Z'
    );
    const approved = transition(
      managerApproved,
      'approve',
      finance,
      undefined,
      '2026-09-05T11:00:00.000Z'
    );

    expect(draftApplication.status).toBe('draft');
    expect(draftApplication.approvals).toEqual([]);
    expect(submitted).not.toBe(draftApplication);
    expect(submitted.status).toBe('pending_manager');
    expect(managerApproved.status).toBe('pending_finance');
    expect(approved.status).toBe('approved');
    expect(submitted.approvals).toHaveLength(1);
    expect(managerApproved.approvals).toHaveLength(2);
    expect(approved.approvals).toHaveLength(3);
    expect(approved.approvals).not.toBe(managerApproved.approvals);
    expect(approved.approvals.map(({ action, from, to }) => ({ action, from, to }))).toEqual([
      { action: 'submit', from: 'draft', to: 'pending_manager' },
      { action: 'approve', from: 'pending_manager', to: 'pending_finance' },
      { action: 'approve', from: 'pending_finance', to: 'approved' }
    ]);
    expect(approved.approvals[2]).toMatchObject({
      id: 'application-1-approval-3',
      actorId: finance.id,
      actorName: finance.name,
      actorRole: 'finance',
      comment: '',
      createdAt: '2026-09-05T11:00:00.000Z'
    });
    expect(approved.updatedAt).toBe('2026-09-05T11:00:00.000Z');
  });
});
