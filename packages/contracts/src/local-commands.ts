import { z } from 'zod';

import { uuidSchema } from './entities.js';
import { syncOperationV1Schema } from './sync-v1.js';

export const localMutationCommandSchema = syncOperationV1Schema;

export const mutationReceiptSchema = z.strictObject({
  operationId: uuidSchema,
  entityId: uuidSchema,
  version: z.number().int().positive(),
});

export type LocalMutationCommand = z.infer<typeof localMutationCommandSchema>;
export type MutationReceipt = z.infer<typeof mutationReceiptSchema>;
