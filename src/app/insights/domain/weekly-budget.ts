import type { Money } from '@pp/shared/kernel';
import { recordsIn, sumMinor, type SpendRecord } from './expense-analytics';
import type { DateRange } from './period';

interface WeeklyBudgetStatus {
  readonly cap: Money;
  readonly spent: Money;
  readonly difference: Money;
  readonly overBudget: boolean;
}

/** Counts every expense in the cap's currency, without ant classification. */
export function weeklyBudgetStatus(cap: Money, records: readonly SpendRecord[], range: DateRange): WeeklyBudgetStatus {
  const { currency } = cap;
  const spentMinor = sumMinor(recordsIn(records, range, currency));
  const remainingMinor = cap.amountMinor - spentMinor;
  return {
    cap,
    spent: { amountMinor: spentMinor, currency },
    difference: { amountMinor: Math.abs(remainingMinor), currency },
    overBudget: remainingMinor < 0,
  };
}
