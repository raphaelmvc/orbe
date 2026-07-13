export type Centavos = number & { readonly __brand: 'Centavos' };

export function centavos(value: number): Centavos {
  if (!Number.isSafeInteger(value)) throw new Error('Centavos must be a safe integer');
  return (value === 0 ? 0 : value) as Centavos;
}

export const add = (left: Centavos, right: Centavos): Centavos => centavos(left + right);
export const subtract = (left: Centavos, right: Centavos): Centavos => centavos(left - right);

const brlPattern = /^-?R?\$?\s*[\d.]+,\d{2}$/;

export function parseBRL(value: string): Centavos {
  if (!brlPattern.test(value)) throw new Error('Invalid BRL value');

  const isNegative = value.startsWith('-');
  const normalized = value.replace(/^-?R?\$?\s*/, '').replaceAll('.', '').replace(',', '');

  return centavos(Number(`${isNegative ? '-' : ''}${normalized}`));
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(value: Centavos): string {
  const integerValue = BigInt(value);
  const isNegative = integerValue < 0n;
  const absoluteValue = isNegative ? -integerValue : integerValue;
  const reais = absoluteValue / 100n;
  const fraction = (absoluteValue % 100n).toString().padStart(2, '0');
  const formattingValue = isNegative ? -(reais || 1n) : reais;

  return brlFormatter
    .formatToParts(formattingValue)
    .map((part) => {
      if (part.type === 'fraction') return fraction;
      if (part.type === 'integer' && isNegative && reais === 0n) return '0';
      return part.value;
    })
    .join('');
}
