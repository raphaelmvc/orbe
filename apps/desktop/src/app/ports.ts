import type { LocalMutationCommand, MutationReceipt } from '@orbe/contracts';
import type { FinancialAccount } from '@orbe/domain';

export interface LocalFinanceStore {
  listAccounts(): Promise<readonly FinancialAccount[]>;
  applyMutation(command: LocalMutationCommand): Promise<MutationReceipt>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}
