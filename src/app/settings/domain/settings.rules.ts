import { DomainError, Money, err, ok, parseCurrency, type CurrencyCode, type Result } from '@pp/shared/kernel';
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

export class InvalidWeeklyBudgetsError extends DomainError {
  readonly code = 'INVALID_WEEKLY_BUDGETS';

  constructor() {
    super('Weekly budgets must have a positive minor-unit amount and a unique valid currency');
  }
}

/** Validates and normalizes both settings updates and explicit caps from storage or backup. */
export function parseWeeklyBudgets(value: unknown): Result<readonly Money[], InvalidWeeklyBudgetsError> {
  if (!Array.isArray(value)) return err(new InvalidWeeklyBudgetsError());
  const currencies = new Set<CurrencyCode>();
  const budgets: Money[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'object' || item === null ||
        !('currency' in item) || typeof item.currency !== 'string' ||
        !('amountMinor' in item) || typeof item.amountMinor !== 'number' ||
        !Number.isSafeInteger(item.amountMinor) || item.amountMinor <= 0) {
      return err(new InvalidWeeklyBudgetsError());
    }
    const code = parseCurrency(item.currency);
    if (!code.ok || currencies.has(code.value)) return err(new InvalidWeeklyBudgetsError());
    currencies.add(code.value);
    budgets.push(Money.fromMinor(item.amountMinor, code.value));
  }
  return ok(budgets);
}

export interface SettingsPatch {
  readonly defaultCurrency?: CurrencyCode;
  readonly antExpenseThreshold?: Money;
  /** Omit to preserve existing caps; use an empty list to clear them. */
  readonly weeklyBudgets?: readonly Money[];
  readonly theme?: ThemePreference;
  readonly lastBackupAt?: string | null;
}

/** Applies a patch and enforces the settings rules; the current settings are never mutated. */
export function applySettingsPatch(
  current: AppSettings,
  patch: SettingsPatch,
): Result<AppSettings, InvalidThresholdError | ThresholdCurrencyRequiredError | InvalidWeeklyBudgetsError> {
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

  if (patch.weeklyBudgets === undefined) return ok(next);
  const budgets = parseWeeklyBudgets(patch.weeklyBudgets);
  return budgets.ok ? ok({ ...next, weeklyBudgets: budgets.value }) : budgets;
}
