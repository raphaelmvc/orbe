import { invoke } from '@tauri-apps/api/core';
import { describe, expect, it, vi } from 'vitest';

import {
  LocalFinanceStoreError,
  createTauriLocalFinanceStore,
} from './tauri-local-finance-store';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const command = {
  operationId: '00000000-0000-4000-8000-000000000005',
  idempotencyKey: 'device-A:42',
  entityType: 'account' as const,
  entityId: '00000000-0000-4000-8000-000000000004',
  baseVersion: 0,
  payload: {
    entityType: 'account' as const,
    name: 'Conta principal',
    type: 'checking' as const,
    color: '#123456',
    openingBalance: 10_000,
    openingBalanceDate: '2026-07-13',
    status: 'active' as const,
    displayOrder: 0,
  },
  deletedAt: null,
  occurredAt: '2026-07-13T12:00:00.000Z',
};

describe('Tauri local finance store', () => {
  it('sends only a validated owner-free command and parses the native receipt', async () => {
    vi.mocked(invoke).mockResolvedValue({
      operationId: command.operationId,
      entityId: command.entityId,
      version: 1,
    });
    const store = createTauriLocalFinanceStore();

    const receipt = await store.applyMutation(command);

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('apply_local_mutation', { command });
    expect(JSON.stringify(vi.mocked(invoke).mock.calls[0])).not.toContain('ownerId');
    expect(receipt).toEqual({
      operationId: command.operationId,
      entityId: command.entityId,
      version: 1,
    });
  });

  it('maps native and malformed-response failures to one stable application error', async () => {
    vi.mocked(invoke)
      .mockRejectedValueOnce(new Error('database path and key details'))
      .mockResolvedValueOnce({ version: 'invalid' });
    const store = createTauriLocalFinanceStore();

    await expect(store.applyMutation(command)).rejects.toEqual(
      expect.objectContaining<Partial<LocalFinanceStoreError>>({
        name: 'LocalFinanceStoreError',
        code: 'LOCAL_FINANCE_UNAVAILABLE',
        message: 'Não foi possível salvar a alteração local.',
      }),
    );
    await expect(store.applyMutation(command)).rejects.toEqual(
      expect.objectContaining<Partial<LocalFinanceStoreError>>({
        code: 'LOCAL_FINANCE_UNAVAILABLE',
      }),
    );
  });
});
