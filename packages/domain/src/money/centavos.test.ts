import { describe, expect, it } from 'vitest';
import { add, centavos, formatBRL, parseBRL, subtract } from './centavos.js';

describe('Centavos', () => {
  it('parses and formats Brazilian money without floating-point arithmetic', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(centavos(123456));
    expect(formatBRL(centavos(123456))).toBe('R$ 1.234,56');
  });

  it('adds integer centavos', () => {
    expect(add(centavos(10), centavos(20))).toBe(centavos(30));
  });

  it('subtracts integer centavos', () => {
    expect(subtract(centavos(30), centavos(20))).toBe(centavos(10));
  });

  it('round-trips the largest safe centavo value exactly', () => {
    const maximum = centavos(Number.MAX_SAFE_INTEGER);

    expect(parseBRL(formatBRL(maximum))).toBe(maximum);
  });

  it('normalizes negative zero to zero', () => {
    expect(Object.is(centavos(-0), -0)).toBe(false);
    expect(formatBRL(centavos(-0))).toBe('R$ 0,00');
  });

  it('formats negative values smaller than one real exactly', () => {
    expect(formatBRL(centavos(-1))).toBe('-R$ 0,01');
    expect(parseBRL('-R$ 0,01')).toBe(centavos(-1));
  });

  it('rejects invalid centavo and Brazilian money inputs', () => {
    expect(() => centavos(1.5)).toThrowError('Centavos must be a safe integer');
    expect(() => parseBRL('R$ 1,2')).toThrowError('Invalid BRL value');
  });

  it('rejects addition and subtraction overflow', () => {
    expect(() => add(centavos(Number.MAX_SAFE_INTEGER), centavos(1))).toThrowError(
      'Centavos must be a safe integer',
    );
    expect(() => subtract(centavos(-Number.MAX_SAFE_INTEGER), centavos(1))).toThrowError(
      'Centavos must be a safe integer',
    );
  });
});
