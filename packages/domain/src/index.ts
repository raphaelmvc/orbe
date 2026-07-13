export const domainPackage = '@orbe/domain' as const;

export { allocateInstallments } from './money/allocate-installments.js';
export { add, centavos, formatBRL, parseBRL, subtract } from './money/centavos.js';
export type { Centavos } from './money/centavos.js';
