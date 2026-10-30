import { DEFAULT_LOCALE, minorExponent, type CurrencyCode } from './currency';
import { DomainError } from './domain-error';
import { err, ok, type Result } from './result';

export class CurrencyMismatchError extends DomainError {
  readonly code = 'CURRENCY_MISMATCH';

  constructor(
    readonly left: CurrencyCode,
    readonly right: CurrencyCode,
  ) {
    super(`Cannot combine ${left} with ${right}`);
  }
}

export class InvalidMoneyError extends DomainError {
  readonly code = 'INVALID_MONEY';
}

/** An amount in the currency's smallest unit (S/ 20.00 = 2000 PEN). Always an integer. */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

const assertSafeInteger = (minor: number): void => {
  if (!Number.isSafeInteger(minor)) {
    throw new InvalidMoneyError(`Amount must be a safe integer in minor units, got ${minor}`);
  }
};

const toMinor = (major: number, exponent: number): number => {
  if (!Number.isFinite(major)) throw new InvalidMoneyError(`Amount must be finite, got ${major}`);
  // The string-exponent trick avoids binary float drift (1.005 -> 101, not 100).
  const text = String(major);
  return text.includes('e')
    ? Math.round(major * 10 ** exponent)
    : Math.round(Number(`${text}e${exponent}`));
};

export const Money = {
  /** Builds money from a major-unit amount: `Money.of(20, PEN)` is S/ 20.00. */
  of(major: number, currency: CurrencyCode): Money {
    const amountMinor = toMinor(major, minorExponent(currency));
    assertSafeInteger(amountMinor);
    return { amountMinor, currency };
  },

  fromMinor(amountMinor: number, currency: CurrencyCode): Money {
    assertSafeInteger(amountMinor);
    return { amountMinor, currency };
  },

  zero(currency: CurrencyCode): Money {
    return { amountMinor: 0, currency };
  },

  isZero(money: Money): boolean {
    return money.amountMinor === 0;
  },

  /** Different currencies never combine: the result is a `CurrencyMismatchError`. */
  add(a: Money, b: Money): Result<Money, CurrencyMismatchError> {
    if (a.currency !== b.currency) return err(new CurrencyMismatchError(a.currency, b.currency));
    return ok(Money.fromMinor(a.amountMinor + b.amountMinor, a.currency));
  },

  /** Negative, zero or positive like `Array.sort`; mismatched currencies are not comparable. */
  compare(a: Money, b: Money): Result<number, CurrencyMismatchError> {
    if (a.currency !== b.currency) return err(new CurrencyMismatchError(a.currency, b.currency));
    return ok(Math.sign(a.amountMinor - b.amountMinor));
  },

  toMajor(money: Money): number {
    return money.amountMinor / 10 ** minorExponent(money.currency);
  },

  format(money: Money, locale: string = DEFAULT_LOCALE): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currency }).format(
      Money.toMajor(money),
    );
  },
} as const;
