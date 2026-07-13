import type { Centavos } from '../money/centavos.js';
import type { EntityId } from '../shared/identity.js';

export type AccountType = 'checking' | 'digital' | 'savings' | 'cash';

export interface FinancialAccount {
  readonly id: EntityId;
  readonly name: string;
  readonly type: AccountType;
  readonly institution?: string;
  readonly color: string;
  readonly openingBalance: Centavos;
  readonly openingBalanceDate: string;
  readonly status: 'active' | 'archived';
  readonly displayOrder: number;
}

export type CreateFinancialAccountCommand = FinancialAccount;

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

export function createFinancialAccount(command: CreateFinancialAccountCommand): FinancialAccount {
  if (!isISOCalendarDate(command.openingBalanceDate)) {
    throw new Error('Invalid account opening balance date');
  }

  return {
    ...command,
    name: command.name.trim(),
  };
}
