import { describe, expect, it } from 'vitest';

import { centavos } from '../money/centavos.js';
import { entityId } from '../shared/identity.js';
import {
  createTransfer,
  postingsForTransfer,
  type CreateTransferCommand,
} from './transfer.js';

const sourceAccountId = entityId('account-source');
const destinationAccountId = entityId('account-destination');

function transferCommand(overrides: Partial<CreateTransferCommand> = {}): CreateTransferCommand {
  return {
    id: entityId('transfer-1'),
    sourceAccountId,
    destinationAccountId,
    description: 'Emergency fund',
    value: centavos(5_000),
    date: '2026-07-13',
    ...overrides,
  };
}

describe('transfer creation', () => {
  it('rejects the same source and destination account', () => {
    expect(() =>
      createTransfer(transferCommand({ destinationAccountId: sourceAccountId })),
    ).toThrowError('Transfer accounts must be different');
  });

  it.each([centavos(0), centavos(-1)])('rejects a non-positive transfer value (%s)', (value) => {
    expect(() => createTransfer(transferCommand({ value }))).toThrowError(
      'Transfer value must be positive',
    );
  });

  it('requires a source account', () => {
    expect(() =>
      createTransfer({
        id: entityId('transfer-without-source'),
        destinationAccountId,
        description: 'Emergency fund',
        value: centavos(5_000),
        date: '2026-07-13',
      }),
    ).toThrowError('Transfer source account is required');
  });

  it('requires a destination account', () => {
    expect(() =>
      createTransfer({
        id: entityId('transfer-without-destination'),
        sourceAccountId,
        description: 'Emergency fund',
        value: centavos(5_000),
        date: '2026-07-13',
      }),
    ).toThrowError('Transfer destination account is required');
  });

  it('trims the transfer description', () => {
    expect(createTransfer(transferCommand({ description: '  Emergency fund  ' })).description).toBe(
      'Emergency fund',
    );
  });

  it.each(['2026-7-13', '2026-06-31'])('rejects an invalid transfer date (%s)', (date) => {
    expect(() => createTransfer(transferCommand({ date }))).toThrowError('Invalid transfer date');
  });
});

describe('transfer postings', () => {
  it('returns one debit and one credit posting for the same transfer without categories', () => {
    const transfer = createTransfer(transferCommand());

    expect(postingsForTransfer(transfer)).toEqual([
      {
        transferId: transfer.id,
        accountId: sourceAccountId,
        value: centavos(5_000),
        direction: 'debit',
      },
      {
        transferId: transfer.id,
        accountId: destinationAccountId,
        value: centavos(5_000),
        direction: 'credit',
      },
    ]);
  });
});
