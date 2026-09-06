import type { TravelApplication } from '../domain/types';
import { seedApplications } from './mock';

const STORAGE_KEY = 'tripflow:data';
const STORAGE_VERSION = 1;
const RECOVERY_WARNING = '本地数据异常，已恢复演示数据';
const READ_WARNING = '无法读取本地数据，已使用演示数据';
const SAVE_WARNING = '保存失败，刷新后数据可能丢失';

interface StoredPayload {
  version: 1;
  applications: TravelApplication[];
}

export type SaveResult =
  | { persisted: true }
  | { persisted: false; warning: typeof SAVE_WARNING };

const payloadFor = (applications: TravelApplication[]): StoredPayload => ({
  version: STORAGE_VERSION,
  applications
});

const cloneApplications = (applications: TravelApplication[]): TravelApplication[] =>
  structuredClone(applications);

export class ApplicationRepository {
  lastWarning: string | null = null;

  constructor(private readonly storage: Storage) {}

  load(): TravelApplication[] {
    let storedValue: string | null;
    try {
      storedValue = this.storage.getItem(STORAGE_KEY);
    } catch {
      this.save(seedApplications);
      this.lastWarning = READ_WARNING;
      return cloneApplications(seedApplications);
    }

    if (storedValue === null) {
      this.lastWarning = null;
      this.save(seedApplications);
      return cloneApplications(seedApplications);
    }

    try {
      const payload: unknown = JSON.parse(storedValue);
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('version' in payload) ||
        payload.version !== STORAGE_VERSION ||
        !('applications' in payload) ||
        !Array.isArray(payload.applications)
      ) {
        throw new Error('Invalid stored payload');
      }

      this.lastWarning = null;
      return payload.applications as TravelApplication[];
    } catch {
      this.lastWarning = RECOVERY_WARNING;
      this.save(seedApplications);
      this.lastWarning = RECOVERY_WARNING;
      return cloneApplications(seedApplications);
    }
  }

  save(applications: TravelApplication[]): SaveResult {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(payloadFor(applications)));
      this.lastWarning = null;
      return { persisted: true };
    } catch {
      this.lastWarning = SAVE_WARNING;
      return { persisted: false, warning: SAVE_WARNING };
    }
  }

  reset(): TravelApplication[] {
    const applications = cloneApplications(seedApplications);
    const result = this.save(applications);
    this.lastWarning = result.persisted ? null : result.warning;
    return applications;
  }
}
