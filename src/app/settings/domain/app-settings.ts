import { DEFAULT_CURRENCY, Money, type CurrencyCode } from '@pp/shared/kernel';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  /** Preselected currency for new expenses. */
  readonly defaultCurrency: CurrencyCode;
  /** Expenses at or below this amount (same currency) count as ant expenses. */
  readonly antExpenseThreshold: Money;
  readonly theme: ThemePreference;
  /** Monday. Fixed in the MVP, kept as data so it can become a preference later. */
  readonly weekStartsOn: 1;
  readonly lastBackupAt: string | null;
}

/** S/ 20.00 */
export const DEFAULT_ANT_THRESHOLD_MAJOR = 20;

export function defaultSettings(): AppSettings {
  return {
    defaultCurrency: DEFAULT_CURRENCY,
    antExpenseThreshold: Money.of(DEFAULT_ANT_THRESHOLD_MAJOR, DEFAULT_CURRENCY),
    theme: 'system',
    weekStartsOn: 1,
    lastBackupAt: null,
  };
}
