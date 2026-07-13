export const domainPackage = '@orbe/domain' as const;

export { createFinancialAccount } from './accounts/account.js';
export type {
  AccountType,
  CreateFinancialAccountCommand,
  FinancialAccount,
} from './accounts/account.js';
export { allocateInstallments } from './money/allocate-installments.js';
export { add, centavos, formatBRL, parseBRL, subtract } from './money/centavos.js';
export type { Centavos } from './money/centavos.js';
export { entityId } from './shared/identity.js';
export type { EntityId } from './shared/identity.js';
export { balanceForAccount } from './transactions/balance.js';
export {
  createTransaction,
  deriveTransactionDisplayState,
} from './transactions/transaction.js';
export type {
  CreateTransactionCommand,
  Transaction,
  TransactionDisplayState,
  TransactionKind,
  TransactionState,
} from './transactions/transaction.js';
export { createTransfer, postingsForTransfer } from './transactions/transfer.js';
export type {
  CreateTransferCommand,
  CreditPosting,
  DebitPosting,
  Transfer,
} from './transactions/transfer.js';
