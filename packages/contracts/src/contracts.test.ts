import { describe, expect, it } from 'vitest';

import { entityPayloadV1Schema } from './entities.js';
import { localMutationCommandSchema, mutationReceiptSchema } from './local-commands.js';
import {
  syncOperationV1Schema,
  syncPullRequestV1Schema,
  syncPullResponseV1Schema,
  syncPushRequestV1Schema,
  syncPushResponseV1Schema,
} from './sync-v1.js';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const DESTINATION_ACCOUNT_ID = '00000000-0000-4000-8000-000000000002';
const CATEGORY_ID = '00000000-0000-4000-8000-000000000003';
const ENTITY_ID = '00000000-0000-4000-8000-000000000004';
const OPERATION_ID = '00000000-0000-4000-8000-000000000005';
const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000006';
const OCCURRED_AT = '2026-07-13T12:00:00.000Z';

const transactionPayload = {
  entityType: 'transaction' as const,
  kind: 'expense' as const,
  description: 'Groceries',
  value: 1_250,
  categoryId: CATEGORY_ID,
  accountId: ACCOUNT_ID,
  dueDate: '2026-07-13',
  state: 'settled' as const,
};

function syncOperation(overrides: Record<string, unknown> = {}) {
  return {
    operationId: OPERATION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    entityType: 'transaction',
    entityId: ENTITY_ID,
    baseVersion: 0,
    payload: transactionPayload,
    deletedAt: null,
    occurredAt: OCCURRED_AT,
    ...overrides,
  };
}

function syncChange(sequence: number) {
  return {
    sequence,
    entityType: 'transaction',
    entityId: ENTITY_ID,
    version: 1,
    payload: transactionPayload,
    deletedAt: null,
    occurredAt: OCCURRED_AT,
  };
}

describe('entity payload contracts', () => {
  it.each([
    {
      entityType: 'account',
      name: 'Main account',
      type: 'checking',
      institution: 'Orbe Bank',
      color: '#123456',
      openingBalance: -1_000,
      openingBalanceDate: '2026-07-01',
      status: 'active',
      displayOrder: 0,
    },
    {
      entityType: 'category',
      name: 'Groceries',
      kind: 'expense',
      parentId: null,
      status: 'active',
      displayOrder: 0,
    },
    transactionPayload,
    {
      entityType: 'transfer',
      sourceAccountId: ACCOUNT_ID,
      destinationAccountId: DESTINATION_ACCOUNT_ID,
      description: 'Internal transfer',
      value: 5_000,
      date: '2026-07-13',
    },
  ])('accepts a valid $entityType payload', (payload) => {
    expect(entityPayloadV1Schema.safeParse(payload).success).toBe(true);
  });

  it('rejects decimal money', () => {
    const result = entityPayloadV1Schema.safeParse({ ...transactionPayload, value: 12.5 });

    expect(result.success).toBe(false);
  });

  it('rejects malformed UUIDs', () => {
    const result = entityPayloadV1Schema.safeParse({
      ...transactionPayload,
      categoryId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown entity types', () => {
    const result = entityPayloadV1Schema.safeParse({ entityType: 'budget' });

    expect(result.success).toBe(false);
  });

  it('rejects a transfer with equal accounts', () => {
    const result = entityPayloadV1Schema.safeParse({
      entityType: 'transfer',
      sourceAccountId: ACCOUNT_ID,
      destinationAccountId: ACCOUNT_ID,
      description: 'Internal transfer',
      value: 5_000,
      date: '2026-07-13',
    });

    expect(result.success).toBe(false);
  });

  it('rejects equal transfer account UUIDs with different letter casing', () => {
    const result = entityPayloadV1Schema.safeParse({
      entityType: 'transfer',
      sourceAccountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      destinationAccountId: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
      description: 'Internal transfer',
      value: 5_000,
      date: '2026-07-13',
    });

    expect(result.success).toBe(false);
  });

  it.each([
    { field: 'dueDate', value: '2026-02-30' },
    { field: 'dueDate', value: '2026-7-13' },
  ])('rejects an invalid calendar date ($value)', ({ field, value }) => {
    const result = entityPayloadV1Schema.safeParse({
      ...transactionPayload,
      [field]: value,
    });

    expect(result.success).toBe(false);
  });
});

describe('local command contracts', () => {
  it('accepts a strict local mutation without owner identity', () => {
    const result = localMutationCommandSchema.safeParse(syncOperation());

    expect(result.success).toBe(true);
  });

  it('rejects ownerId supplied by a client', () => {
    const result = localMutationCommandSchema.safeParse({
      ...syncOperation(),
      ownerId: '00000000-0000-4000-8000-000000000007',
    });

    expect(result.success).toBe(false);
  });

  it('validates mutation receipts returned by native storage', () => {
    const result = mutationReceiptSchema.safeParse({
      operationId: OPERATION_ID,
      entityId: ENTITY_ID,
      version: 1,
    });

    expect(result.success).toBe(true);
  });
});

describe('sync v1 contracts', () => {
  it('accepts an opaque idempotency key', () => {
    const result = syncOperationV1Schema.safeParse(
      syncOperation({ idempotencyKey: 'device-A:42' }),
    );

    expect(result.success).toBe(true);
  });

  it('trims an opaque idempotency key', () => {
    const result = syncOperationV1Schema.safeParse(
      syncOperation({ idempotencyKey: '  device-A:42  ' }),
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.idempotencyKey).toBe('device-A:42');
  });

  it.each(['', '   '])('rejects a blank idempotency key (%j)', (idempotencyKey) => {
    const result = syncOperationV1Schema.safeParse(syncOperation({ idempotencyKey }));

    expect(result.success).toBe(false);
  });

  it('rejects an operation without an idempotency key', () => {
    const operation = syncOperation();
    Reflect.deleteProperty(operation, 'idempotencyKey');

    expect(syncOperationV1Schema.safeParse(operation).success).toBe(false);
  });

  it('rejects an operation whose entity type differs from its payload', () => {
    const result = syncOperationV1Schema.safeParse({
      ...syncOperation(),
      entityType: 'account',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid timestamps', () => {
    const result = syncOperationV1Schema.safeParse({
      ...syncOperation(),
      occurredAt: '2026-07-13',
    });

    expect(result.success).toBe(false);
  });

  it('rejects ownerId in an authenticated push body', () => {
    const result = syncPushRequestV1Schema.safeParse({
      protocolVersion: 1,
      operations: [syncOperation()],
      ownerId: '00000000-0000-4000-8000-000000000007',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a valid push response', () => {
    const result = syncPushResponseV1Schema.safeParse({
      protocolVersion: 1,
      results: [
        {
          operationId: OPERATION_ID,
          entityId: ENTITY_ID,
          version: 1,
          sequence: 11,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid pull request', () => {
    const result = syncPullRequestV1Schema.safeParse({
      protocolVersion: 1,
      cursor: 10,
      limit: 100,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a pull change sequence below its starting cursor', () => {
    const result = syncPullResponseV1Schema.safeParse({
      protocolVersion: 1,
      startingCursor: 10,
      changes: [syncChange(9)],
      nextCursor: 9,
      hasMore: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ['changes', 0, 'sequence'],
      ]);
    }
  });

  it('rejects non-monotonic pull sequences', () => {
    const result = syncPullResponseV1Schema.safeParse({
      protocolVersion: 1,
      startingCursor: 10,
      changes: [syncChange(12), syncChange(11)],
      nextCursor: 11,
      hasMore: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ['changes', 1, 'sequence'],
      ]);
    }
  });

  it('rejects a next cursor that does not match the last change', () => {
    const result = syncPullResponseV1Schema.safeParse({
      protocolVersion: 1,
      startingCursor: 10,
      changes: [syncChange(11)],
      nextCursor: 10,
      hasMore: false,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a strictly increasing pull response', () => {
    const result = syncPullResponseV1Schema.safeParse({
      protocolVersion: 1,
      startingCursor: 10,
      changes: [syncChange(11), syncChange(12)],
      nextCursor: 12,
      hasMore: false,
    });

    expect(result.success).toBe(true);
  });
});
