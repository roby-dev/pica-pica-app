/**
 * Parses what a person types into minor units.
 * "20.50" and "20,50" are 20.50; "1,250.50" and "1.250,50" are 1250.50; "1,250" is 1250.
 * Returns null when the text is empty or cannot be read unambiguously.
 */
export function parseAmountToMinor(text: string, exponent: number): number | null {
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (cleaned === '' || !/\d/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  const decimalAt = decimalIndex(cleaned, lastDot, lastComma, exponent);
  if (decimalAt === undefined) return null;

  const intRaw = decimalAt === -1 ? cleaned : cleaned.slice(0, decimalAt);
  const fraction = decimalAt === -1 ? '' : cleaned.slice(decimalAt + 1);

  if (!isValidGrouping(intRaw)) return null;
  if (!/^\d*$/.test(fraction) || fraction.length > exponent) return null;

  const integer = intRaw.replace(/[.,]/g, '') || '0';
  const minor = Number(integer + fraction.padEnd(exponent, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Index of the decimal separator, -1 when there is none, undefined when ambiguous or invalid. */
function decimalIndex(
  text: string,
  lastDot: number,
  lastComma: number,
  exponent: number,
): number | undefined {
  if (lastDot === -1 && lastComma === -1) return -1;
  if (lastDot !== -1 && lastComma !== -1) return Math.max(lastDot, lastComma);

  const index = Math.max(lastDot, lastComma);
  const separator = text[index];
  const occurrences = text.split(separator).length - 1;
  const digitsAfter = text.length - index - 1;

  if (occurrences > 1) return -1; // repeated separator can only be thousands grouping
  // es-PE writes 1,250 for one thousand two hundred fifty; a lone dot is always a decimal point.
  if (separator === ',' && digitsAfter === 3 && exponent !== 3 && index > 0) return -1;
  return index;
}

/** Thousands groups must be 1-3 digits first, then exactly 3. */
function isValidGrouping(integerPart: string): boolean {
  if (!/[.,]/.test(integerPart)) return /^\d*$/.test(integerPart);
  return /^\d{1,3}([.,]\d{3})+$/.test(integerPart);
}
