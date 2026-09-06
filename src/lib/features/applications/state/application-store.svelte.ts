import type { ApplicationRepository, SaveResult } from '../data/repository';
import type {
  Person,
  TravelApplication,
  TravelFormDraft,
  ValidationErrors,
  WorkflowAction
} from '../domain/types';
import { validateDraft } from '../domain/validation';
import { transition } from '../domain/workflow';

export interface ApplicationStoreDependencies {
  repository: Pick<ApplicationRepository, 'load' | 'save' | 'reset' | 'lastWarning'>;
  people: Person[];
  currentActor: () => Person;
  createId: () => string;
  now: () => string;
}

export type CreateMode = 'draft' | 'submit';
export type ApplicationSubscriber = (applications: TravelApplication[]) => void;
export interface PendingPersistence {
  applicationId: string;
  warning: string;
}

export class ApplicationStore {
  applications = $state<TravelApplication[]>([]);
  pendingPersistence = $state<PendingPersistence | null>(null);
  submitErrors = $state<ValidationErrors>({});
  private readonly subscribers = new Set<ApplicationSubscriber>();

  constructor(private readonly dependencies: ApplicationStoreDependencies) {}

  get warning(): string | null {
    return this.dependencies.repository.lastWarning;
  }

  get pendingCount(): number {
    const actor = this.dependencies.currentActor();

    if (actor.role === 'manager') {
      return this.applications.filter(({ status }) => status === 'pending_manager').length;
    }
    if (actor.role === 'finance') {
      return this.applications.filter(({ status }) => status === 'pending_finance').length;
    }

    return 0;
  }

  get recentApplications(): TravelApplication[] {
    return [...this.applications]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }

  subscribe(subscriber: ApplicationSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.applications);
    return () => this.subscribers.delete(subscriber);
  }

  initialize(): TravelApplication[] {
    this.pendingPersistence = null;
    return this.publish(this.dependencies.repository.load());
  }

  create(draft: TravelFormDraft, mode: CreateMode): TravelApplication {
    if (this.pendingPersistence) throw new Error('请先重试保存当前申请');

    const applicant = this.dependencies.people.find(({ id }) => id === draft.applicantId);
    if (!applicant) throw new Error('未找到申请人');

    if (mode === 'submit') this.assertValidDraft(draft, applicant);

    const { applicantId: _applicantId, ...travel } = draft;
    const occurredAt = this.dependencies.now();
    const application: TravelApplication = {
      id: this.dependencies.createId(),
      applicant: { ...applicant },
      travel: { ...travel },
      status: 'draft',
      createdAt: occurredAt,
      updatedAt: occurredAt,
      approvals: []
    };
    const created =
      mode === 'submit'
        ? transition(application, 'submit', applicant, '', occurredAt)
        : application;

    this.submitErrors = {};
    const result = this.persistAndPublish([...this.applications, created]);
    this.pendingPersistence = result.persisted
      ? null
      : { applicationId: created.id, warning: result.warning };
    return created;
  }

  update(id: string, draft: TravelFormDraft, mode: CreateMode): TravelApplication {
    if (this.pendingPersistence) throw new Error('请先重试保存当前申请');

    const index = this.applications.findIndex((application) => application.id === id);
    if (index < 0) throw new Error('未找到申请');

    const current = this.applications[index];
    if (current.status !== 'draft') throw new Error('当前状态不允许编辑');
    if (this.dependencies.currentActor().id !== current.applicant.id) {
      throw new Error('当前角色无权执行此操作');
    }

    const applicant = this.dependencies.people.find(({ id: personId }) => personId === draft.applicantId);
    if (!applicant) throw new Error('未找到申请人');

    if (mode === 'submit') this.assertValidDraft(draft, applicant);

    const { applicantId: _applicantId, ...travel } = draft;
    const occurredAt = this.dependencies.now();
    const next: TravelApplication = {
      ...current,
      applicant: { ...applicant },
      travel: { ...travel },
      updatedAt: occurredAt
    };
    const updated =
      mode === 'submit' ? transition(next, 'submit', applicant, '', occurredAt) : next;

    this.submitErrors = {};
    const applications = [...this.applications];
    applications[index] = updated;
    const result = this.persistAndPublish(applications);
    this.pendingPersistence = result.persisted
      ? null
      : { applicationId: updated.id, warning: result.warning };
    return updated;
  }

  retryPersistence(): SaveResult {
    const result = this.dependencies.repository.save(this.applications);
    this.pendingPersistence = result.persisted
      ? null
      : this.pendingPersistence && {
          ...this.pendingPersistence,
          warning: result.warning
        };
    return result;
  }

  act(id: string, action: WorkflowAction, comment = ''): TravelApplication {
    if (this.pendingPersistence) throw new Error('请先重试保存当前申请');

    const index = this.applications.findIndex((application) => application.id === id);
    if (index < 0) throw new Error('未找到申请');

    const current = this.applications[index];
    if (action === 'submit') {
      this.assertValidDraft(
        { applicantId: current.applicant.id, ...current.travel },
        current.applicant
      );
    }

    const updated = transition(
      this.applications[index],
      action,
      this.dependencies.currentActor(),
      comment,
      this.dependencies.now()
    );
    this.submitErrors = {};
    const applications = [...this.applications];
    applications[index] = updated;
    const result = this.persistAndPublish(applications);
    this.pendingPersistence = result.persisted
      ? null
      : { applicationId: updated.id, warning: result.warning };
    return updated;
  }

  reset(): TravelApplication[] {
    this.pendingPersistence = null;
    return this.publish(this.dependencies.repository.reset());
  }

  private assertValidDraft(draft: TravelFormDraft, applicant: Person): void {
    const errors = validateDraft(draft, this.dependencies.now().slice(0, 10), applicant);
    if (Object.keys(errors).length === 0) return;
    this.submitErrors = errors;
    throw new Error('申请信息不完整');
  }

  private persistAndPublish(applications: TravelApplication[]): SaveResult {
    const result = this.dependencies.repository.save(applications);
    this.publish(applications);
    return result;
  }

  private publish(applications: TravelApplication[]): TravelApplication[] {
    this.applications = applications;
    for (const subscriber of this.subscribers) subscriber(this.applications);
    return applications;
  }
}

export const createApplicationStore = (
  dependencies: ApplicationStoreDependencies
): ApplicationStore => new ApplicationStore(dependencies);
