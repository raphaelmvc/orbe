import { v4 as uuid } from 'uuid';

import { createTauriLocalFinanceStore } from '../infrastructure/tauri-local-finance-store';
import type { Clock, IdGenerator, LocalFinanceStore } from './ports';

export interface AppDependencies {
  readonly localFinanceStore: LocalFinanceStore;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

const localFinanceStore: LocalFinanceStore = {
  async listAccounts() {
    return [];
  },
  ...createTauriLocalFinanceStore(),
};

export const appDependencies: AppDependencies = {
  localFinanceStore,
  clock: {
    now: () => new Date(),
  },
  idGenerator: {
    next: uuid,
  },
};
