import type { Centavos } from '../money/centavos.js';
import type { EntityId } from '../shared/identity.js';

export type TransactionKind = 'expense' | 'income';
export type TransactionState = 'pending' | 'settled';
export type TransactionDisplayState = 'pending' | 'overdue' | 'paid' | 'received';

export interface Transaction {
  readonly id: EntityId;
  readonly kind: TransactionKind;
  readonly description: string;
  readonly value: Centavos;
  readonly categoryId: EntityId;
  readonly accountId?: EntityId;
  readonly dueDate: string;
  readonly state: TransactionState;
}

export type CreateTransactionCommand = Transaction;

function isISOCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const daysInMonth = daysByMonth[month - 1];

  return daysInMonth !== undefined && day >= 1 && day <= daysInMonth;
}

export function createTransaction(command: CreateTransactionCommand): Transaction {
  if (command.value <= 0) throw new Error('Transaction value must be positive');
  if (command.categoryId.trim().length === 0) throw new Error('Transaction category is required');
  if (command.state === 'settled' && command.accountId === undefined) {
    throw new Error('Settled transaction account is required');
  }
  if (!isISOCalendarDate(command.dueDate)) throw new Error('Invalid transaction due date');

  return {
    ...command,
    description: command.description.trim(),
  };
}

export function deriveTransactionDisplayState(
  transaction: Transaction,
  now: string,
): TransactionDisplayState {
  if (transaction.state === 'settled') {
    return transaction.kind === 'expense' ? 'paid' : 'received';
  }

  return transaction.dueDate < now ? 'overdue' : 'pending';
}
