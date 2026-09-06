import { describe, expect, it } from 'vitest';
import { mockPeople, seedApplications } from '../data/mock';
import type { TravelApplication } from '../domain/types';
import { createApplicationStore } from './application-store.svelte';
import { createRoleState } from './role-state.svelte';

describe('role state', () => {
  it('starts with the applicant and switches by mock person ID', () => {
    const roleState = createRoleState(mockPeople);

    expect(roleState.selectedId).toBe('p-alice');
    expect(roleState.currentPerson.name).toBe('陈晓');
    expect(roleState.currentRole).toBe('applicant');

    roleState.select('p-manager');

    expect(roleState.selectedId).toBe('p-manager');
    expect(roleState.currentPerson.name).toBe('王经理');
    expect(roleState.currentRole).toBe('manager');
  });

  it('resolves the current actor when an action is performed', () => {
    const pending = seedApplications.find(
      ({ status }) => status === 'pending_manager'
    ) as TravelApplication;
    const roleState = createRoleState(mockPeople);
    const store = createApplicationStore({
      repository: {
        lastWarning: null,
        load: () => [pending],
        save: () => ({ persisted: true }),
        reset: () => []
      },
      people: mockPeople,
      currentActor: () => roleState.currentPerson,
      createId: () => 'unused',
      now: () => '2026-09-05T11:00:00.000Z'
    });
    store.initialize();

    roleState.select('p-manager');
    const updated = store.act(pending.id, 'approve');

    expect(updated.approvals.at(-1)).toMatchObject({
      actorId: 'p-manager',
      actorName: '王经理',
      actorRole: 'manager'
    });
  });
});
