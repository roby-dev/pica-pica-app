import type { Brand } from './brand';
import { DomainError } from './domain-error';
import { err, ok, type Result } from './result';

export type CurrencyCode = Brand<string, 'CurrencyCode'>;

export const DEFAULT_LOCALE = 'es-PE';

export class InvalidCurrencyError extends DomainError {
  readonly code = 'INVALID_CURRENCY';
}

let supported: ReadonlySet<string> | undefined;

const supportedCurrencies = (): ReadonlySet<string> =>
  (supported ??= new Set(Intl.supportedValuesOf('currency')));

/** Validates an ISO-4217 code (case-insensitive) against the runtime's currency list. */
export function parseCurrency(code: string): Result<CurrencyCode, InvalidCurrencyError> {
  const upper = code.trim().toUpperCase();
  return supportedCurrencies().has(upper)
    ? ok(upper as CurrencyCode)
    : err(new InvalidCurrencyError(`Unknown currency code: "${code}"`));
}

/** For compile-time constants known to be valid (e.g. the app default). */
export const currency = (code: string): CurrencyCode => {
  const parsed = parseCurrency(code);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
};

export const DEFAULT_CURRENCY: CurrencyCode = 'PEN' as CurrencyCode;

/** Number of decimal digits of the currency's minor unit (PEN=2, JPY=0). */
export function minorExponent(code: CurrencyCode): number {
  return (
    new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: code }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}
