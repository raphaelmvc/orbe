import { z } from 'zod';

import {
  entityPayloadV1Schema,
  entityTypeV1Schema,
  isoTimestampSchema,
  uuidSchema,
  type EntityPayloadV1,
  type EntityTypeV1,
} from './entities.js';

interface EntityEnvelopeV1 {
  readonly entityType: EntityTypeV1;
  readonly payload: EntityPayloadV1;
}

function validateEntityTypeMatchesPayload<T extends EntityEnvelopeV1>(
  envelope: T,
  context: z.core.$RefinementCtx<T>,
): void {
  if (envelope.entityType !== envelope.payload.entityType) {
    context.addIssue({
      code: 'custom',
      message: 'Entity type must match payload entity type',
      path: ['payload', 'entityType'],
    });
  }
}

export interface SyncOperationV1 {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly entityType: 'account' | 'category' | 'transaction' | 'transfer';
  readonly entityId: string;
  readonly baseVersion: number;
  readonly payload: EntityPayloadV1;
  readonly deletedAt: string | null;
  readonly occurredAt: string;
}

export const syncOperationV1Schema = z
  .strictObject({
    operationId: uuidSchema,
    idempotencyKey: z.string().trim().min(1),
    entityType: entityTypeV1Schema,
    entityId: uuidSchema,
    baseVersion: z.number().int().nonnegative(),
    payload: entityPayloadV1Schema,
    deletedAt: isoTimestampSchema.nullable(),
    occurredAt: isoTimestampSchema,
  })
  .superRefine(validateEntityTypeMatchesPayload) satisfies z.ZodType<SyncOperationV1>;

export const syncPushRequestV1Schema = z.strictObject({
  protocolVersion: z.literal(1),
  operations: z.array(syncOperationV1Schema).min(1).max(100),
});

const syncPushResultV1Schema = z.strictObject({
  operationId: uuidSchema,
  entityId: uuidSchema,
  version: z.number().int().positive(),
  sequence: z.number().int().positive(),
});

export const syncPushResponseV1Schema = z.strictObject({
  protocolVersion: z.literal(1),
  results: z.array(syncPushResultV1Schema).max(100),
});

export const syncPullRequestV1Schema = z.strictObject({
  protocolVersion: z.literal(1),
  cursor: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(500),
});

const syncChangeV1Schema = z
  .strictObject({
    sequence: z.number().int().positive(),
    entityType: entityTypeV1Schema,
    entityId: uuidSchema,
    version: z.number().int().positive(),
    payload: entityPayloadV1Schema,
    deletedAt: isoTimestampSchema.nullable(),
    occurredAt: isoTimestampSchema,
  })
  .superRefine(validateEntityTypeMatchesPayload);

export const syncPullResponseV1Schema = z
  .strictObject({
    protocolVersion: z.literal(1),
    startingCursor: z.number().int().nonnegative(),
    changes: z.array(syncChangeV1Schema).max(500),
    nextCursor: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .superRefine((response, context) => {
    let previousSequence = response.startingCursor;

    response.changes.forEach((change, index) => {
      if (change.sequence <= previousSequence) {
        context.addIssue({
          code: 'custom',
          message: 'Pull change sequences must increase from the starting cursor',
          path: ['changes', index, 'sequence'],
        });
      }

      previousSequence = change.sequence;
    });

    if (response.nextCursor !== previousSequence) {
      context.addIssue({
        code: 'custom',
        message: 'Next cursor must equal the latest applied sequence',
        path: ['nextCursor'],
      });
    }
  });

export type SyncPushRequestV1 = z.infer<typeof syncPushRequestV1Schema>;
export type SyncPushResponseV1 = z.infer<typeof syncPushResponseV1Schema>;
export type SyncPullRequestV1 = z.infer<typeof syncPullRequestV1Schema>;
export type SyncPullResponseV1 = z.infer<typeof syncPullResponseV1Schema>;
