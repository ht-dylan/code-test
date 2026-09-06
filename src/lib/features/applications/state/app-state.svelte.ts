import { browser } from '$app/environment';
import { mockPeople } from '../data/mock';
import { ApplicationRepository } from '../data/repository';
import { createApplicationStore } from './application-store.svelte';
import { createDraftStore } from './draft-store.svelte';
import { createRoleState } from './role-state.svelte';

const unavailableStorage: Storage = {
  length: 0,
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {}
};

const localDate = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const repository = new ApplicationRepository(browser ? window.localStorage : unavailableStorage);

export const draftStore = createDraftStore({
  people: mockPeople,
  today: localDate
});

export const roleState = createRoleState(mockPeople);

export const applicationStore = createApplicationStore({
  repository,
  people: mockPeople,
  currentActor: () => roleState.currentPerson,
  createId: () => crypto.randomUUID(),
  now: () => new Date().toISOString()
});

let initialized = false;

export const initializeApplication = (): void => {
  if (initialized) return;
  initialized = true;
  applicationStore.initialize();
};

if (browser) initializeApplication();
