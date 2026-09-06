import { describe, expect, it, vi } from 'vitest';
import { applicationStore, initializeApplication } from './app-state.svelte';

describe('application initialization', () => {
  it('loads applications at browser module load and stays idempotent', () => {
    expect(applicationStore.applications.length).toBeGreaterThan(0);

    const initialize = vi.spyOn(applicationStore, 'initialize');
    initializeApplication();
    initializeApplication();

    expect(initialize).not.toHaveBeenCalled();
    expect(applicationStore.applications.length).toBeGreaterThan(0);
  });
});
