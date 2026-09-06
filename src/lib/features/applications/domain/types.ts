export type Role = 'applicant' | 'manager' | 'finance';

export type ApplicationStatus =
  | 'draft'
  | 'pending_manager'
  | 'pending_finance'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type WorkflowAction = 'submit' | 'approve' | 'reject' | 'withdraw';

export interface Person {
  id: string;
  employeeNo: string;
  name: string;
  department: string;
  title: string;
  contact: string;
  role: Role;
}

export interface TravelFormDraft {
  applicantId: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  transport: '飞机' | '高铁' | '汽车' | '其他' | '';
  budget: number | null;
  notes: string;
}

export interface ApprovalRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: WorkflowAction;
  from: ApplicationStatus;
  to: ApplicationStatus;
  comment: string;
  createdAt: string;
}

export interface TravelApplication {
  id: string;
  applicant: Person;
  travel: Omit<TravelFormDraft, 'applicantId'>;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  approvals: ApprovalRecord[];
}

export type ValidationErrors = Partial<Record<keyof TravelFormDraft, string>>;
