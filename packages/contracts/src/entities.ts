import { z } from 'zod';

export const entityTypeV1Schema = z.enum(['account', 'category', 'transaction', 'transfer']);
export const uuidSchema = z.uuid().toLowerCase();
export const isoCalendarDateSchema = z.iso.date();
export const isoTimestampSchema = z.iso.datetime({ offset: true });

const moneyInCentsSchema = z.number().int();
const displayOrderSchema = z.number().int().nonnegative();
const nameSchema = z.string().trim().min(1).max(120);
const descriptionSchema = z.string().trim().max(240);

export const accountPayloadV1Schema = z.strictObject({
  entityType: z.literal('account'),
  name: nameSchema,
  type: z.enum(['checking', 'digital', 'savings', 'cash']),
  institution: z.string().trim().min(1).max(120).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  openingBalance: moneyInCentsSchema,
  openingBalanceDate: isoCalendarDateSchema,
  status: z.enum(['active', 'archived']),
  displayOrder: displayOrderSchema,
});

export const categoryPayloadV1Schema = z.strictObject({
  entityType: z.literal('category'),
  name: nameSchema,
  kind: z.enum(['expense', 'income']),
  parentId: uuidSchema.nullable(),
  status: z.enum(['active', 'inactive']),
  displayOrder: displayOrderSchema,
});

export const transactionPayloadV1Schema = z
  .strictObject({
    entityType: z.literal('transaction'),
    kind: z.enum(['expense', 'income']),
    description: descriptionSchema,
    value: moneyInCentsSchema.positive(),
    categoryId: uuidSchema,
    accountId: uuidSchema.optional(),
    dueDate: isoCalendarDateSchema,
    state: z.enum(['pending', 'settled']),
  })
  .superRefine((transaction, context) => {
    if (transaction.state === 'settled' && transaction.accountId === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A settled transaction requires an account',
        path: ['accountId'],
      });
    }
  });

export const transferPayloadV1Schema = z
  .strictObject({
    entityType: z.literal('transfer'),
    sourceAccountId: uuidSchema,
    destinationAccountId: uuidSchema,
    description: descriptionSchema,
    value: moneyInCentsSchema.positive(),
    date: isoCalendarDateSchema,
  })
  .superRefine((transfer, context) => {
    if (transfer.sourceAccountId === transfer.destinationAccountId) {
      context.addIssue({
        code: 'custom',
        message: 'Transfer accounts must be different',
        path: ['destinationAccountId'],
      });
    }
  });

export const entityPayloadV1Schema = z.discriminatedUnion('entityType', [
  accountPayloadV1Schema,
  categoryPayloadV1Schema,
  transactionPayloadV1Schema,
  transferPayloadV1Schema,
]);

export type EntityTypeV1 = z.infer<typeof entityTypeV1Schema>;
export type AccountPayloadV1 = z.infer<typeof accountPayloadV1Schema>;
export type CategoryPayloadV1 = z.infer<typeof categoryPayloadV1Schema>;
export type TransactionPayloadV1 = z.infer<typeof transactionPayloadV1Schema>;
export type TransferPayloadV1 = z.infer<typeof transferPayloadV1Schema>;
export type EntityPayloadV1 = z.infer<typeof entityPayloadV1Schema>;
