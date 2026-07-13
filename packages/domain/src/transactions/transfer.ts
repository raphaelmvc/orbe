import type { Centavos } from '../money/centavos.js';
import type { EntityId } from '../shared/identity.js';

export interface CreateTransferCommand {
  readonly id: EntityId;
  readonly sourceAccountId?: EntityId;
  readonly destinationAccountId?: EntityId;
  readonly description: string;
  readonly value: Centavos;
  readonly date: string;
}

export interface Transfer {
  readonly id: EntityId;
  readonly sourceAccountId: EntityId;
  readonly destinationAccountId: EntityId;
  readonly description: string;
  readonly value: Centavos;
  readonly date: string;
}

interface TransferPosting {
  readonly transferId: EntityId;
  readonly accountId: EntityId;
  readonly value: Centavos;
}

export interface DebitPosting extends TransferPosting {
  readonly direction: 'debit';
}

export interface CreditPosting extends TransferPosting {
  readonly direction: 'credit';
}

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

export function createTransfer(command: CreateTransferCommand): Transfer {
  if (command.sourceAccountId === undefined) throw new Error('Transfer source account is required');
  if (command.destinationAccountId === undefined) {
    throw new Error('Transfer destination account is required');
  }
  if (command.sourceAccountId === command.destinationAccountId) {
    throw new Error('Transfer accounts must be different');
  }
  if (command.value <= 0) throw new Error('Transfer value must be positive');
  if (!isISOCalendarDate(command.date)) throw new Error('Invalid transfer date');

  return {
    ...command,
    sourceAccountId: command.sourceAccountId,
    destinationAccountId: command.destinationAccountId,
    description: command.description.trim(),
  };
}

export function postingsForTransfer(
  transfer: Transfer,
): readonly [DebitPosting, CreditPosting] {
  return [
    {
      transferId: transfer.id,
      accountId: transfer.sourceAccountId,
      value: transfer.value,
      direction: 'debit',
    },
    {
      transferId: transfer.id,
      accountId: transfer.destinationAccountId,
      value: transfer.value,
      direction: 'credit',
    },
  ];
}
