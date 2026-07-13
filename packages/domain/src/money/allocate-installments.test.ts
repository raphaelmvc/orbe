import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { allocateInstallments } from './allocate-installments.js';
import { centavos } from './centavos.js';

describe('allocateInstallments', () => {
  it('preserves the total and applies all rounding residue to the last installment', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        fc.integer({ min: 1, max: 120 }),
        (total, count) => {
          const installments = allocateInstallments(centavos(total), count);
          const installmentsBeforeLast = installments.slice(0, -1);
          const base = Math.floor(total / count);

          expect(installments).toHaveLength(count);
          expect(installments.every(Number.isSafeInteger)).toBe(true);
          expect(installments.reduce((sum, installment) => sum + installment, 0)).toBe(total);

          if (installmentsBeforeLast.length > 1) {
            expect(
              Math.max(...installmentsBeforeLast) - Math.min(...installmentsBeforeLast),
            ).toBeLessThanOrEqual(1);
          }

          expect(installmentsBeforeLast.every((installment) => installment === base)).toBe(true);
          expect(installments.at(-1)).toBe(base + (total % count));
        },
      ),
    );
  });
});
