import type { ApplicationStatus, TravelApplication } from './types';

export interface ApplicationSummaryStats {
  total: number;
  approvedRate: number;
  totalBudget: number;
  averageApprovalHours: number;
}

export interface StatusBreakdownItem {
  status: ApplicationStatus;
  value: number;
}

export interface MonthlyTrendItem {
  month: string;
  applications: number;
  budget: number;
}

export interface DepartmentBudgetItem {
  department: string;
  budget: number;
}

const applicationStatuses: ApplicationStatus[] = [
  'draft',
  'pending_manager',
  'pending_finance',
  'approved',
  'rejected',
  'withdrawn'
];

const budgetOf = (application: TravelApplication): number => application.travel.budget ?? 0;

const approvalHours = (application: TravelApplication): number | undefined => {
  if (application.status !== 'approved' && application.status !== 'rejected') return undefined;

  const submission = application.approvals.find((record) => record.action === 'submit');
  const finalApproval = application.approvals.findLast(
    (record) => record.to === application.status
  );

  if (!submission || !finalApproval) return undefined;

  const duration =
    new Date(finalApproval.createdAt).getTime() - new Date(submission.createdAt).getTime();
  return Number.isFinite(duration) && duration >= 0 ? duration / 3_600_000 : undefined;
};

export const summarizeApplications = (
  applications: TravelApplication[],
  _now: Date
): ApplicationSummaryStats => {
  const completedApprovalHours = applications
    .map(approvalHours)
    .filter((hours): hours is number => hours !== undefined);
  const approved = applications.filter((application) => application.status === 'approved').length;

  return {
    total: applications.length,
    approvedRate:
      applications.length === 0 ? 0 : Math.round((approved / applications.length) * 1_000) / 10,
    totalBudget: applications.reduce((total, application) => total + budgetOf(application), 0),
    averageApprovalHours:
      completedApprovalHours.length === 0
        ? 0
        : completedApprovalHours.reduce((total, hours) => total + hours, 0) /
          completedApprovalHours.length
  };
};

export const statusBreakdown = (applications: TravelApplication[]): StatusBreakdownItem[] =>
  applicationStatuses.map((status) => ({
    status,
    value: applications.filter((application) => application.status === status).length
  }));

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

export const monthlyTrend = (
  applications: TravelApplication[],
  now: Date
): MonthlyTrendItem[] => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  return Array.from({ length: 6 }, (_, offset) => {
    const month = monthKey(
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1))
    );
    const monthlyApplications = applications.filter(
      (application) => monthKey(new Date(application.createdAt)) === month
    );

    return {
      month,
      applications: monthlyApplications.length,
      budget: monthlyApplications.reduce(
        (total, application) => total + budgetOf(application),
        0
      )
    };
  });
};

export const departmentBudgets = (
  applications: TravelApplication[]
): DepartmentBudgetItem[] => {
  const budgets = new Map<string, number>();

  for (const application of applications) {
    const department = application.applicant.department;
    budgets.set(department, (budgets.get(department) ?? 0) + budgetOf(application));
  }

  return Array.from(budgets, ([department, budget]) => ({ department, budget })).sort(
    (left, right) =>
      right.budget - left.budget ||
      (left.department < right.department ? -1 : left.department > right.department ? 1 : 0)
  );
};
