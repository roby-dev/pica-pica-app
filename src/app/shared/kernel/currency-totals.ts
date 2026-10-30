import type { CurrencyCode } from './currency';
import type { Money } from './money';

/** Minor-unit sums keyed by currency. The only sanctioned way to aggregate amounts. */
export type CurrencyTotals = ReadonlyMap<CurrencyCode, number>;

export const emptyTotals = (): CurrencyTotals => new Map();

/** Returns a new totals map with `money` added to its own currency's bucket. */
export function addTo(totals: CurrencyTotals, money: Money): CurrencyTotals {
  const next = new Map(totals);
  next.set(money.currency, (next.get(money.currency) ?? 0) + money.amountMinor);
  return next;
}

export const totalFor = (totals: CurrencyTotals, currency: CurrencyCode): Money => ({
  amountMinor: totals.get(currency) ?? 0,
  currency,
});

export const toMoneyList = (totals: CurrencyTotals): readonly Money[] =>
  [...totals].map(([currency, amountMinor]) => ({ amountMinor, currency }));

export const sumMoney = (items: readonly Money[]): CurrencyTotals =>
  items.reduce(addTo, emptyTotals());
