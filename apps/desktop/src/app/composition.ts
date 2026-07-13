import { v4 as uuid } from 'uuid';

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
  async applyMutation() {
    throw new Error('Local finance persistence is not configured yet');
  },
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
