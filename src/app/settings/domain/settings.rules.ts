import { DomainError, err, ok, type CurrencyCode, type Money, type Result } from '@pp/shared/kernel';
import type { AppSettings, ThemePreference } from './app-settings';

export class InvalidThresholdError extends DomainError {
  readonly code = 'INVALID_THRESHOLD';

  constructor() {
    super('The ant expense threshold must be greater than zero');
  }
}

/** Changing the default currency needs a threshold in that currency: there is no conversion. */
export class ThresholdCurrencyRequiredError extends DomainError {
  readonly code = 'THRESHOLD_CURRENCY_REQUIRED';

  constructor(readonly currency: CurrencyCode) {
    super(`Set a new ant expense threshold in ${currency}`);
  }
}

export interface SettingsPatch {
  readonly defaultCurrency?: CurrencyCode;
  readonly antExpenseThreshold?: Money;
  readonly theme?: ThemePreference;
  readonly lastBackupAt?: string | null;
}

/** Applies a patch and enforces the settings rules; the current settings are never mutated. */
export function applySettingsPatch(
  current: AppSettings,
  patch: SettingsPatch,
): Result<AppSettings, InvalidThresholdError | ThresholdCurrencyRequiredError> {
  const next: AppSettings = {
    ...current,
    defaultCurrency: patch.defaultCurrency ?? current.defaultCurrency,
    antExpenseThreshold: patch.antExpenseThreshold ?? current.antExpenseThreshold,
    theme: patch.theme ?? current.theme,
    lastBackupAt: patch.lastBackupAt === undefined ? current.lastBackupAt : patch.lastBackupAt,
  };

  if (next.antExpenseThreshold.amountMinor <= 0) return err(new InvalidThresholdError());

  const currencyChanged = next.defaultCurrency !== current.defaultCurrency;
  if (currencyChanged && next.antExpenseThreshold.currency !== next.defaultCurrency) {
    return err(new ThresholdCurrencyRequiredError(next.defaultCurrency));
  }

  return ok(next);
}
