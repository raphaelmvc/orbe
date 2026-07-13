import { describe, expect, it } from 'vitest';

import { createFinancialAccount } from '../accounts/account.js';
import { entityId } from '../shared/identity.js';
import { centavos } from '../money/centavos.js';
import { balanceForAccount } from './balance.js';
import {
  createTransaction,
  deriveTransactionDisplayState,
  type Transaction,
} from './transaction.js';

const accountId = entityId('account-main');
const categoryId = entityId('category-general');

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return createTransaction({
    id: entityId('transaction-1'),
    kind: 'expense',
    description: 'Groceries',
    value: centavos(2_500),
    categoryId,
    accountId,
    dueDate: '2026-07-12',
    state: 'pending',
    ...overrides,
  });
}

function account(status: 'active' | 'archived' = 'active') {
  return createFinancialAccount({
    id: accountId,
    name: 'Main account',
    type: 'checking',
    institution: 'Orbe Bank',
    color: '#123456',
    openingBalance: centavos(10_000),
    openingBalanceDate: '2026-07-01',
    status,
    displayOrder: 0,
  });
}

describe('transaction status and account balance', () => {
  it('subtracts a paid expense from its account', () => {
    const expense = transaction({ state: 'settled' });

    expect(balanceForAccount(account(), [expense])).toBe(centavos(7_500));
    expect(deriveTransactionDisplayState(expense, '2026-07-13')).toBe('paid');
  });

  it('does not subtract a pending expense from its account', () => {
    expect(balanceForAccount(account(), [transaction()])).toBe(centavos(10_000));
  });

  it('keeps a pending expense pending before its due date', () => {
    expect(deriveTransactionDisplayState(transaction(), '2026-07-11')).toBe('pending');
  });

  it('derives an overdue display state without changing the stored state', () => {
    const expense = transaction();

    expect(deriveTransactionDisplayState(expense, '2026-07-13')).toBe('overdue');
    expect(expense.state).toBe('pending');
  });

  it('adds received income to its account', () => {
    const income = transaction({ kind: 'income', state: 'settled' });

    expect(balanceForAccount(account(), [income])).toBe(centavos(12_500));
    expect(deriveTransactionDisplayState(income, '2026-07-13')).toBe('received');
  });

  it('does not add pending income to its account', () => {
    const income = transaction({ kind: 'income' });

    expect(balanceForAccount(account(), [income])).toBe(centavos(10_000));
  });

  it('keeps transaction history in an archived account balance', () => {
    const paidExpense = transaction({ state: 'settled' });

    expect(balanceForAccount(account('archived'), [paidExpense])).toBe(centavos(7_500));
  });
});

describe('financial entry construction', () => {
  it('trims an account name', () => {
    const result = createFinancialAccount({
      ...account(),
      name: '  Main account  ',
    });

    expect(result.name).toBe('Main account');
  });

  it('trims a transaction description', () => {
    expect(transaction({ description: '  Groceries  ' }).description).toBe('Groceries');
  });

  it.each([centavos(0), centavos(-1)])('rejects a non-positive transaction value (%s)', (value) => {
    expect(() => transaction({ value })).toThrowError('Transaction value must be positive');
  });

  it('requires a category', () => {
    expect(() => transaction({ categoryId: '   ' as ReturnType<typeof entityId> })).toThrowError(
      'Transaction category is required',
    );
  });

  it('requires an account for a settled non-card transaction', () => {
    expect(() =>
      createTransaction({
        id: entityId('transaction-without-account'),
        kind: 'expense',
        description: 'Groceries',
        value: centavos(2_500),
        categoryId,
        dueDate: '2026-07-12',
        state: 'settled',
      }),
    ).toThrowError('Settled transaction account is required');
  });

  it.each(['2026-7-12', '2026-02-30'])('rejects an invalid transaction due date (%s)', (dueDate) => {
    expect(() => transaction({ dueDate })).toThrowError('Invalid transaction due date');
  });

  it.each(['2026/07/01', '2026-04-31'])(
    'rejects an invalid account opening balance date (%s)',
    (openingBalanceDate) => {
      expect(() => createFinancialAccount({ ...account(), openingBalanceDate })).toThrowError(
        'Invalid account opening balance date',
      );
    },
  );
});
