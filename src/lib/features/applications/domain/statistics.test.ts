import { describe, expect, it } from 'vitest';
import type {
  ApplicationStatus,
  ApprovalRecord,
  Person,
  TravelApplication,
  WorkflowAction
} from './types';
import {
  departmentBudgets,
  monthlyTrend,
  statusBreakdown,
  summarizeApplications
} from './statistics';

const person = (id: string, department: string): Person => ({
  id,
  employeeNo: id.toUpperCase(),
  name: id,
  department,
  title: '员工',
  contact: `${id}@example.com`,
  role: 'applicant'
});

const record = (
  id: string,
  action: WorkflowAction,
  from: ApplicationStatus,
  to: ApplicationStatus,
  createdAt: string
): ApprovalRecord => ({
  id,
  actorId: 'actor-1',
  actorName: '审批人',
  actorRole: action === 'submit' ? 'applicant' : 'finance',
  action,
  from,
  to,
  comment: '',
  createdAt
});

const application = (
  id: string,
  department: string,
  budget: number,
  status: ApplicationStatus,
  createdAt: string,
  approvals: ApprovalRecord[]
): TravelApplication => ({
  id,
  applicant: person(`person-${id}`, department),
  travel: {
    origin: '上海',
    destination: '北京',
    startDate: createdAt.slice(0, 10),
    endDate: createdAt.slice(0, 10),
    purpose: '客户拜访',
    transport: '高铁',
    budget,
    notes: ''
  },
  status,
  createdAt,
  updatedAt: approvals.at(-1)?.createdAt ?? createdAt,
  approvals
});

const apps: TravelApplication[] = [
  application('approved', '研发部', 8000, 'approved', '2026-07-01T07:00:00.000Z', [
    record(
      'approved-submit',
      'submit',
      'draft',
      'pending_manager',
      '2026-07-01T08:00:00.000Z'
    ),
    record(
      'approved-manager',
      'approve',
      'pending_manager',
      'pending_finance',
      '2026-07-01T12:00:00.000Z'
    ),
    record(
      'approved-finance',
      'approve',
      'pending_finance',
      'approved',
      '2026-07-02T08:00:00.000Z'
    )
  ]),
  application('pending', '市场部', 3000, 'pending_finance', '2026-09-10T02:00:00.000Z', [
    record(
      'pending-submit',
      'submit',
      'draft',
      'pending_manager',
      '2026-09-10T03:00:00.000Z'
    ),
    record(
      'pending-manager',
      'approve',
      'pending_manager',
      'pending_finance',
      '2026-09-10T05:00:00.000Z'
    )
  ]),
  application('rejected', '财务部', 1500, 'rejected', '2026-04-15T01:00:00.000Z', [
    record(
      'rejected-submit',
      'submit',
      'draft',
      'pending_manager',
      '2026-04-15T02:00:00.000Z'
    ),
    record(
      'rejected-manager',
      'reject',
      'pending_manager',
      'rejected',
      '2026-04-16T06:00:00.000Z'
    )
  ])
];

describe('statistics aggregations', () => {
  it('summarizes applications and excludes unfinished approval durations', () => {
    expect(summarizeApplications(apps, new Date('2026-09-30T00:00:00.000Z'))).toEqual({
      total: 3,
      approvedRate: 33.3,
      totalBudget: 12500,
      averageApprovalHours: 26
    });
  });

  it('counts every application status and zero-fills absent statuses', () => {
    expect(statusBreakdown(apps)).toContainEqual({ status: 'approved', value: 1 });
    expect(statusBreakdown(apps)).toContainEqual({ status: 'draft', value: 0 });
  });

  it('ranks department budgets from highest to lowest', () => {
    expect(departmentBudgets(apps)).toEqual([
      { department: '研发部', budget: 8000 },
      { department: '市场部', budget: 3000 },
      { department: '财务部', budget: 1500 }
    ]);
  });

  it('emits six consecutive calendar months with zero-filled values', () => {
    expect(monthlyTrend(apps, new Date('2026-09-30T00:00:00.000Z'))).toEqual([
      { month: '2026-04', applications: 1, budget: 1500 },
      { month: '2026-05', applications: 0, budget: 0 },
      { month: '2026-06', applications: 0, budget: 0 },
      { month: '2026-07', applications: 1, budget: 8000 },
      { month: '2026-08', applications: 0, budget: 0 },
      { month: '2026-09', applications: 1, budget: 3000 }
    ]);
  });

  it('returns stable empty aggregates', () => {
    expect(summarizeApplications([], new Date('2026-09-30T00:00:00.000Z'))).toEqual({
      total: 0,
      approvedRate: 0,
      totalBudget: 0,
      averageApprovalHours: 0
    });
    expect(departmentBudgets([])).toEqual([]);
    expect(monthlyTrend([], new Date('2026-01-15T00:00:00.000Z'))).toEqual([
      { month: '2025-08', applications: 0, budget: 0 },
      { month: '2025-09', applications: 0, budget: 0 },
      { month: '2025-10', applications: 0, budget: 0 },
      { month: '2025-11', applications: 0, budget: 0 },
      { month: '2025-12', applications: 0, budget: 0 },
      { month: '2026-01', applications: 0, budget: 0 }
    ]);
  });
});
