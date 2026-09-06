import { describe, expect, it } from 'vitest';
import type { TravelApplication } from '../domain/types';
import { mockPeople, seedApplications } from './mock';
import { ApplicationRepository } from './repository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('storage access denied');
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }
}

describe('mock fixtures', () => {
  it('provide the required people, departments, and application statuses', () => {
    expect(mockPeople.length).toBeGreaterThanOrEqual(6);
    expect(mockPeople.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['p-alice', 'p-manager', 'p-finance'])
    );
    expect(new Set(mockPeople.map(({ department }) => department))).toEqual(
      new Set(['研发部', '市场部', '财务部'])
    );
    expect(seedApplications).toHaveLength(8);
    expect(new Set(seedApplications.map(({ status }) => status))).toEqual(
      new Set([
        'draft',
        'pending_manager',
        'pending_finance',
        'approved',
        'rejected',
        'withdrawn'
      ])
    );
  });
});

describe('ApplicationRepository', () => {
  it('seeds storage and returns demo applications on first load', () => {
    const storage = new MemoryStorage();
    const repository = new ApplicationRepository(storage);

    expect(repository.load()).toEqual(seedApplications);
    expect(JSON.parse(storage.getItem('tripflow:data') ?? '')).toEqual({
      version: 1,
      applications: seedApplications
    });
  });

  it('loads applications saved by another repository instance', () => {
    const storage = new MemoryStorage();
    const repository = new ApplicationRepository(storage);
    const application: TravelApplication = {
      ...seedApplications[0],
      id: 'persisted-application'
    };

    expect(repository.save([application])).toEqual({ persisted: true });

    expect(new ApplicationRepository(storage).load()).toEqual([application]);
  });

  it.each([
    ['malformed JSON', '{broken'],
    ['unsupported version', JSON.stringify({ version: 2, applications: [] })],
    ['invalid applications', JSON.stringify({ version: 1, applications: {} })]
  ])('recovers seed data from %s', (_case, storedValue) => {
    const storage = new MemoryStorage();
    const repository = new ApplicationRepository(storage);
    storage.setItem('tripflow:data', storedValue);

    expect(repository.load()).toEqual(seedApplications);
    expect(repository.lastWarning).toBe('本地数据异常，已恢复演示数据');
    expect(JSON.parse(storage.getItem('tripflow:data') ?? '')).toEqual({
      version: 1,
      applications: seedApplications
    });
  });

  it('retains a recovery warning when replacing invalid data cannot be persisted', () => {
    const storage = new MemoryStorage();
    storage.setItem('tripflow:data', '{broken');
    storage.failWrites = true;
    const repository = new ApplicationRepository(storage);

    expect(repository.load()).toEqual(seedApplications);
    expect(repository.lastWarning).toBe('本地数据异常，已恢复演示数据');
  });

  it('uses seed data when storage reads and recovery writes are unavailable', () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    storage.failWrites = true;
    const repository = new ApplicationRepository(storage);

    expect(repository.load()).toEqual(seedApplications);
    expect(repository.lastWarning).toBe('无法读取本地数据，已使用演示数据');
  });

  it('reports failed saves without throwing', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const repository = new ApplicationRepository(storage);

    expect(repository.save(seedApplications)).toEqual({
      persisted: false,
      warning: '保存失败，刷新后数据可能丢失'
    });
  });

  it('clears an earlier warning after a successful save', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const repository = new ApplicationRepository(storage);
    repository.save(seedApplications);
    storage.failWrites = false;

    repository.save([]);

    expect(repository.lastWarning).toBeNull();
  });

  it('resets persisted data to seed applications', () => {
    const storage = new MemoryStorage();
    const repository = new ApplicationRepository(storage);
    repository.save([]);

    expect(repository.reset()).toEqual(seedApplications);
    expect(new ApplicationRepository(storage).load()).toEqual(seedApplications);
    expect(repository.lastWarning).toBeNull();
  });
});
