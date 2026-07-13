import { invoke } from '@tauri-apps/api/core';
import {
  localMutationCommandSchema,
  mutationReceiptSchema,
  type LocalMutationCommand,
  type MutationReceipt,
} from '@orbe/contracts';

import type { LocalFinanceStore } from '../app/ports';

const STABLE_MESSAGE = 'Não foi possível salvar a alteração local.';

export class LocalFinanceStoreError extends Error {
  readonly code = 'LOCAL_FINANCE_UNAVAILABLE' as const;

  constructor() {
    super(STABLE_MESSAGE);
    this.name = 'LocalFinanceStoreError';
  }
}

type MutationStore = Pick<LocalFinanceStore, 'applyMutation'>;

export function createTauriLocalFinanceStore(): MutationStore {
  return {
    async applyMutation(command: LocalMutationCommand): Promise<MutationReceipt> {
      try {
        const validatedCommand = localMutationCommandSchema.parse(command);
        const receipt = await invoke<unknown>('apply_local_mutation', {
          command: validatedCommand,
        });

        return mutationReceiptSchema.parse(receipt);
      } catch {
        throw new LocalFinanceStoreError();
      }
    },
  };
}
