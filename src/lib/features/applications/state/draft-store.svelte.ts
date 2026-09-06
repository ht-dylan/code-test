import type {
  Person,
  TravelApplication,
  TravelFormDraft,
  ValidationErrors
} from '../domain/types';
import { validateDraft } from '../domain/validation';

export type DraftFocusSection = 'applicant' | 'travel' | null;

export interface DraftStoreDependencies {
  people: Person[];
  today: () => string;
}

const emptyDraft = (): TravelFormDraft => ({
  applicantId: '',
  origin: '',
  destination: '',
  startDate: '',
  endDate: '',
  purpose: '',
  transport: '',
  budget: null,
  notes: ''
});

export class DraftStore {
  draft = $state<TravelFormDraft>(emptyDraft());
  errors = $state<ValidationErrors>({});
  focusSection = $state<DraftFocusSection>(null);
  editingId = $state<string | null>(null);

  constructor(private readonly dependencies: DraftStoreDependencies) {}

  setField<K extends keyof TravelFormDraft>(field: K, value: TravelFormDraft[K]): void {
    this.draft[field] = value;
    if (field in this.errors) {
      const { [field]: _removed, ...remainingErrors } = this.errors;
      this.errors = remainingErrors;
    }
  }

  validate(): ValidationErrors {
    const applicant = this.dependencies.people.find(({ id }) => id === this.draft.applicantId);
    this.errors = validateDraft(this.draft, this.dependencies.today(), applicant);
    return this.errors;
  }

  formPath(hash?: string): string {
    const path = this.editingId ? `/applications/${this.editingId}/edit` : '/applications/new';
    return hash ? `${path}#${hash}` : path;
  }

  load(application: TravelApplication): void {
    this.editingId = application.id;
    this.draft = {
      applicantId: application.applicant.id,
      ...application.travel
    };
    this.errors = {};
    this.focusSection = null;
  }

  clear(): void {
    this.draft = emptyDraft();
    this.errors = {};
    this.focusSection = null;
    this.editingId = null;
  }
}

export const createDraftStore = (dependencies: DraftStoreDependencies): DraftStore =>
  new DraftStore(dependencies);
