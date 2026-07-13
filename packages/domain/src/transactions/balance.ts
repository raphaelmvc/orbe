import type { FinancialAccount } from '../accounts/account.js';
import { add, subtract, type Centavos } from '../money/centavos.js';
import type { Transaction } from './transaction.js';

export function balanceForAccount(
  account: FinancialAccount,
  transactions: readonly Transaction[],
): Centavos {
  return transactions.reduce((balance, transaction) => {
    if (transaction.state !== 'settled' || transaction.accountId !== account.id) return balance;

    return transaction.kind === 'expense'
      ? subtract(balance, transaction.value)
      : add(balance, transaction.value);
  }, account.openingBalance);
}
