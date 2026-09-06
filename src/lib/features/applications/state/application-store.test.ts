import { describe, expect, it } from 'vitest';
import { ApplicationRepository } from '../data/repository';
import { mockPeople, seedApplications } from '../data/mock';
import type { Person, TravelApplication, TravelFormDraft } from '../domain/types';
import { createApplicationStore } from './application-store.svelte';
import { createDraftStore } from './draft-store.svelte';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const alice = mockPeople.find(({ id }) => id === 'p-alice') as Person;
const manager = mockPeople.find(({ id }) => id === 'p-manager') as Person;
const finance = mockPeople.find(({ id }) => id === 'p-finance') as Person;

const validDraft: TravelFormDraft = {
  applicantId: alice.id,
  origin: '上海',
  destination: '北京',
  startDate: '2026-09-20',
  endDate: '2026-09-22',
  purpose: '客户拜访',
  transport: '高铁',
  budget: 3000,
  notes: '靠窗座位'
};

const setup = (initial: TravelApplication[] = []) => {
  const repository = new ApplicationRepository(new MemoryStorage());
  repository.save(initial);
  let actor = alice;
  let currentTime = '2026-09-05T10:00:00.000Z';
  const store = createApplicationStore({
    repository,
    people: mockPeople,
    currentActor: () => actor,
    createId: () => 'app-created',
    now: () => currentTime
  });

  return {
    repository,
    store,
    setActor(nextActor: Person) {
      actor = nextActor;
    },
    setTime(nextTime: string) {
      currentTime = nextTime;
    }
  };
};

describe('application store', () => {
  it('initializes from the repository and immediately updates subscribers', () => {
    const initial = seedApplications.slice(0, 2);
    const { store } = setup(initial);
    const emissions: TravelApplication[][] = [];
    const unsubscribe = store.subscribe((applications) => emissions.push(applications));

    store.initialize();

    expect(store.applications).toEqual(initial);
    expect(emissions).toEqual([[], initial]);
    unsubscribe();
  });

  it('creates and persists a draft with an applicant snapshot', () => {
    const { repository, store } = setup();
    store.initialize();

    const created = store.create(validDraft, 'draft');

    expect(created).toMatchObject({
      id: 'app-created',
      applicant: alice,
      status: 'draft',
      createdAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
      approvals: []
    });
    expect(created.applicant).not.toBe(alice);
    expect(created.travel).toEqual({
      origin: '上海',
      destination: '北京',
      startDate: '2026-09-20',
      endDate: '2026-09-22',
      purpose: '客户拜访',
      transport: '高铁',
      budget: 3000,
      notes: '靠窗座位'
    });
    expect(repository.load()).toEqual([created]);
  });

  it('creates a draft when only an applicant is selected', () => {
    const { repository, store } = setup();
    store.initialize();

    const created = store.create(
      {
        applicantId: alice.id,
        origin: '',
        destination: '',
        startDate: '',
        endDate: '',
        purpose: '',
        transport: '',
        budget: null,
        notes: ''
      },
      'draft'
    );

    expect(created.status).toBe('draft');
    expect(created.applicant.id).toBe(alice.id);
    expect(created.travel.origin).toBe('');
    expect(repository.load()).toEqual([created]);
  });

  it('rejects create submit for an incomplete draft without persisting', () => {
    const { repository, store } = setup();
    store.initialize();

    expect(() =>
      store.create(
        {
          applicantId: alice.id,
          origin: '',
          destination: '',
          startDate: '',
          endDate: '',
          purpose: '',
          transport: '',
          budget: null,
          notes: ''
        },
        'submit'
      )
    ).toThrow('申请信息不完整');

    expect(store.submitErrors).toMatchObject({
      origin: '请输入出发地',
      destination: '请输入目的地',
      startDate: '请选择开始日期',
      endDate: '请选择结束日期',
      purpose: '请输入出差事由',
      transport: '请选择交通方式',
      budget: '预计预算必须大于 0'
    });
    expect(store.applications).toEqual([]);
    expect(repository.load()).toEqual([]);
  });

  it('rejects act submit on an incomplete draft and keeps status draft', () => {
    const { store } = setup();
    store.initialize();
    const created = store.create(
      {
        applicantId: alice.id,
        origin: '',
        destination: '',
        startDate: '',
        endDate: '',
        purpose: '',
        transport: '',
        budget: null,
        notes: ''
      },
      'draft'
    );

    expect(() => store.act(created.id, 'submit')).toThrow('申请信息不完整');
    expect(store.applications[0].status).toBe('draft');
    expect(store.submitErrors).toMatchObject({
      origin: '请输入出发地',
      destination: '请输入目的地',
      budget: '预计预算必须大于 0'
    });
  });

  it('creates and immediately submits an application through the domain transition', () => {
    const { repository, store } = setup();
    store.initialize();

    const created = store.create(validDraft, 'submit');

    expect(created.status).toBe('pending_manager');
    expect(created.approvals).toEqual([
      expect.objectContaining({
        id: 'app-created-approval-1',
        actorId: alice.id,
        action: 'submit',
        from: 'draft',
        to: 'pending_manager',
        createdAt: '2026-09-05T10:00:00.000Z'
      })
    ]);
    expect(repository.load()).toEqual([created]);
  });

  it('applies manager and finance actions and publishes each persisted result', () => {
    const pendingManager = seedApplications.find(
      ({ status }) => status === 'pending_manager'
    ) as TravelApplication;
    const { repository, store, setActor, setTime } = setup([pendingManager]);
    store.initialize();
    const statuses: string[] = [];
    store.subscribe(([application]) => {
      if (application) statuses.push(application.status);
    });

    setActor(manager);
    setTime('2026-09-05T11:00:00.000Z');
    const pendingFinance = store.act(pendingManager.id, 'approve', '经理同意');
    setActor(finance);
    setTime('2026-09-05T12:00:00.000Z');
    const approved = store.act(pendingManager.id, 'approve', '财务同意');

    expect(pendingFinance.status).toBe('pending_finance');
    expect(approved.status).toBe('approved');
    expect(approved.approvals.slice(-2)).toEqual([
      expect.objectContaining({
        actorId: manager.id,
        comment: '经理同意',
        createdAt: '2026-09-05T11:00:00.000Z'
      }),
      expect.objectContaining({
        actorId: finance.id,
        comment: '财务同意',
        createdAt: '2026-09-05T12:00:00.000Z'
      })
    ]);
    expect(statuses).toEqual(['pending_manager', 'pending_finance', 'approved']);
    expect(repository.load()).toEqual([approved]);
  });

  it('rejects acting on an unknown application', () => {
    const { store } = setup();
    store.initialize();

    expect(() => store.act('missing', 'approve')).toThrow('未找到申请');
  });

  it('derives the current role pending count and five most recent applications', () => {
    const { store, setActor } = setup(seedApplications);
    store.initialize();

    setActor(manager);
    expect(store.pendingCount).toBe(
      seedApplications.filter(({ status }) => status === 'pending_manager').length
    );
    setActor(finance);
    expect(store.pendingCount).toBe(
      seedApplications.filter(({ status }) => status === 'pending_finance').length
    );
    setActor(alice);
    expect(store.pendingCount).toBe(0);
    expect(store.recentApplications).toHaveLength(5);
    expect(store.recentApplications.map(({ createdAt }) => createdAt)).toEqual(
      [...seedApplications]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
        .map(({ createdAt }) => createdAt)
    );
  });

  it('resets repository and store state to demo applications', () => {
    const { repository, store } = setup([]);
    store.initialize();

    expect(store.reset()).toEqual(seedApplications);
    expect(store.applications).toEqual(seedApplications);
    expect(repository.load()).toEqual(seedApplications);
  });
});

describe('draft store', () => {
  it('keeps field values and focus section in memory until cleared', () => {
    const store = createDraftStore({
      people: mockPeople,
      today: () => '2026-09-05'
    });

    store.setField('applicantId', alice.id);
    store.setField('destination', '北京');
    store.focusSection = 'travel';

    expect(store.draft.applicantId).toBe(alice.id);
    expect(store.draft.destination).toBe('北京');
    expect(store.focusSection).toBe('travel');

    store.clear();
    expect(store.draft.applicantId).toBe('');
    expect(store.draft.destination).toBe('');
    expect(store.focusSection).toBeNull();
  });

  it('exposes validation errors and clears a field error when it changes', () => {
    const store = createDraftStore({
      people: mockPeople,
      today: () => '2026-09-05'
    });

    const errors = store.validate();
    expect(errors).toMatchObject({
      applicantId: '请选择申请人',
      origin: '请输入出发地',
      destination: '请输入目的地'
    });
    expect(store.errors).toEqual(errors);

    store.setField('origin', '上海');
    expect(store.errors.origin).toBeUndefined();
  });

  it('validates against the selected mock person and injected date', () => {
    const store = createDraftStore({
      people: mockPeople,
      today: () => '2026-09-05'
    });
    for (const [field, value] of Object.entries(validDraft)) {
      store.setField(
        field as keyof TravelFormDraft,
        value as TravelFormDraft[keyof TravelFormDraft]
      );
    }

    expect(store.validate()).toEqual({});
  });
});
