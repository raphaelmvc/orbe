import { centavos, type Centavos } from './centavos.js';

export function allocateInstallments(total: Centavos, count: number): readonly Centavos[] {
  if (total <= 0 || !Number.isInteger(count) || count < 1) {
    throw new Error('Invalid installments');
  }

  const base = Math.floor(total / count);
  const installmentsBeforeLast = Array.from({ length: count - 1 }, () => centavos(base));
  const assigned = base * (count - 1);

  return [...installmentsBeforeLast, centavos(total - assigned)];
}
