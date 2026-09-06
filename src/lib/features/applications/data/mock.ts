import type { Person, TravelApplication } from '../domain/types';
import { transition } from '../domain/workflow';

export const mockPeople: Person[] = [
  {
    id: 'p-alice',
    employeeNo: 'RD001',
    name: '陈晓',
    department: '研发部',
    title: '前端工程师',
    contact: '13800138001',
    role: 'applicant'
  },
  {
    id: 'p-bob',
    employeeNo: 'MK001',
    name: '林悦',
    department: '市场部',
    title: '市场专员',
    contact: 'lin.yue@example.com',
    role: 'applicant'
  },
  {
    id: 'p-charlie',
    employeeNo: 'RD002',
    name: '周航',
    department: '研发部',
    title: '后端工程师',
    contact: '13900139002',
    role: 'applicant'
  },
  {
    id: 'p-manager',
    employeeNo: 'RD900',
    name: '王经理',
    department: '研发部',
    title: '研发经理',
    contact: 'manager@example.com',
    role: 'manager'
  },
  {
    id: 'p-market-manager',
    employeeNo: 'MK900',
    name: '赵经理',
    department: '市场部',
    title: '市场经理',
    contact: '13600136003',
    role: 'manager'
  },
  {
    id: 'p-finance',
    employeeNo: 'FN001',
    name: '孙会计',
    department: '财务部',
    title: '财务专员',
    contact: 'finance@example.com',
    role: 'finance'
  }
];

const peopleById = new Map(mockPeople.map((person) => [person.id, person]));
const person = (id: string): Person => {
  const result = peopleById.get(id);
  if (!result) throw new Error(`Unknown mock person: ${id}`);
  return result;
};

const createDraft = (
  id: string,
  applicantId: string,
  createdAt: string,
  destination: string,
  budget: number
): TravelApplication => ({
  id,
  applicant: { ...person(applicantId) },
  travel: {
    origin: '上海',
    destination,
    startDate: createdAt.slice(0, 7) + '-20',
    endDate: createdAt.slice(0, 7) + '-22',
    purpose: `前往${destination}开展业务`,
    transport: '高铁',
    budget,
    notes: ''
  },
  status: 'draft',
  createdAt,
  updatedAt: createdAt,
  approvals: []
});

const submit = (application: TravelApplication, at: string): TravelApplication =>
  transition(application, 'submit', application.applicant, '', at);

const managerApprove = (application: TravelApplication, at: string): TravelApplication =>
  transition(application, 'approve', person('p-manager'), '同意', at);

const financeApprove = (application: TravelApplication, at: string): TravelApplication =>
  transition(application, 'approve', person('p-finance'), '预算合理', at);

const aprilApproved = financeApprove(
  managerApprove(
    submit(
      createDraft('app-001', 'p-alice', '2026-04-08T01:00:00.000Z', '北京', 3200),
      '2026-04-08T02:00:00.000Z'
    ),
    '2026-04-08T05:00:00.000Z'
  ),
  '2026-04-08T08:00:00.000Z'
);

const mayRejected = transition(
  submit(
    createDraft('app-002', 'p-bob', '2026-05-12T01:00:00.000Z', '广州', 4800),
    '2026-05-12T02:00:00.000Z'
  ),
  'reject',
  person('p-manager'),
  '行程安排需调整',
  '2026-05-12T04:00:00.000Z'
);

const juneWithdrawnDraft = submit(
  createDraft('app-003', 'p-charlie', '2026-06-03T01:00:00.000Z', '杭州', 1800),
  '2026-06-03T02:00:00.000Z'
);
const juneWithdrawn = transition(
  juneWithdrawnDraft,
  'withdraw',
  juneWithdrawnDraft.applicant,
  '计划变更',
  '2026-06-03T03:00:00.000Z'
);

const julyFinance = managerApprove(
  submit(
    createDraft('app-004', 'p-alice', '2026-07-15T01:00:00.000Z', '深圳', 5200),
    '2026-07-15T02:00:00.000Z'
  ),
  '2026-07-15T05:00:00.000Z'
);

const augustManager = submit(
  createDraft('app-005', 'p-bob', '2026-08-09T01:00:00.000Z', '成都', 2600),
  '2026-08-09T02:00:00.000Z'
);

const septemberApproved = financeApprove(
  managerApprove(
    submit(
      createDraft('app-006', 'p-charlie', '2026-09-01T01:00:00.000Z', '南京', 2100),
      '2026-09-01T02:00:00.000Z'
    ),
    '2026-09-01T04:00:00.000Z'
  ),
  '2026-09-01T06:00:00.000Z'
);

export const seedApplications: TravelApplication[] = [
  aprilApproved,
  mayRejected,
  juneWithdrawn,
  julyFinance,
  augustManager,
  septemberApproved,
  createDraft('app-007', 'p-alice', '2026-08-28T01:00:00.000Z', '苏州', 900),
  submit(
    createDraft('app-008', 'p-charlie', '2026-09-03T01:00:00.000Z', '武汉', 2300),
    '2026-09-03T02:00:00.000Z'
  )
];
