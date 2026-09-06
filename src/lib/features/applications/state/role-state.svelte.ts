import type { Person, Role } from '../domain/types';

export class RoleState {
  selectedId = $state('');

  constructor(private readonly people: Person[]) {
    const applicant = people.find(({ role }) => role === 'applicant');
    if (!applicant) throw new Error('未找到申请人角色');
    this.selectedId = applicant.id;
  }

  get currentPerson(): Person {
    const person = this.people.find(({ id }) => id === this.selectedId);
    if (!person) throw new Error('未找到当前角色');
    return person;
  }

  get currentRole(): Role {
    return this.currentPerson.role;
  }

  select(personId: string): void {
    if (!this.people.some(({ id }) => id === personId)) {
      throw new Error('未找到所选角色');
    }
    this.selectedId = personId;
  }
}

export const createRoleState = (people: Person[]): RoleState => new RoleState(people);
