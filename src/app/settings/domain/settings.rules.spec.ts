import { Money, currency } from '@pp/shared/kernel';
import { defaultSettings } from './app-settings';
import {
  InvalidThresholdError,
  ThresholdCurrencyRequiredError,
  applySettingsPatch,
} from './settings.rules';

const USD = currency('USD');

describe('defaultSettings', () => {
  it('uses PEN, a S/ 20.00 threshold and Monday weeks', () => {
    const settings = defaultSettings();
    expect(settings.defaultCurrency).toBe('PEN');
    expect(settings.antExpenseThreshold).toEqual({ amountMinor: 2000, currency: 'PEN' });
    expect(settings.weekStartsOn).toBe(1);
    expect(settings.theme).toBe('system');
  });
});

describe('applySettingsPatch', () => {
  it('applies theme and backup date without touching the rest', () => {
    const result = applySettingsPatch(defaultSettings(), { theme: 'dark', lastBackupAt: 'x' });
    expect(result.ok && result.value.theme).toBe('dark');
    expect(result.ok && result.value.lastBackupAt).toBe('x');
    expect(result.ok && result.value.antExpenseThreshold).toEqual(defaultSettings().antExpenseThreshold);
  });

  it('can clear lastBackupAt explicitly', () => {
    const current = { ...defaultSettings(), lastBackupAt: 'x' };
    const result = applySettingsPatch(current, { lastBackupAt: null });
    expect(result.ok && result.value.lastBackupAt).toBeNull();
  });

  it('rejects a zero or negative threshold', () => {
    for (const minor of [0, -100]) {
      const result = applySettingsPatch(defaultSettings(), {
        antExpenseThreshold: Money.fromMinor(minor, defaultSettings().defaultCurrency),
      });
      expect(!result.ok && result.error).toBeInstanceOf(InvalidThresholdError);
    }
  });

  it('rejects a currency change without a threshold in the new currency', () => {
    const result = applySettingsPatch(defaultSettings(), { defaultCurrency: USD });
    expect(!result.ok && result.error).toBeInstanceOf(ThresholdCurrencyRequiredError);
  });

  it('rejects a currency change whose threshold is still in the old currency', () => {
    const result = applySettingsPatch(defaultSettings(), {
      defaultCurrency: USD,
      antExpenseThreshold: Money.of(20, defaultSettings().defaultCurrency),
    });
    expect(!result.ok && result.error).toBeInstanceOf(ThresholdCurrencyRequiredError);
  });

  it('accepts a currency change together with a matching threshold', () => {
    const result = applySettingsPatch(defaultSettings(), {
      defaultCurrency: USD,
      antExpenseThreshold: Money.of(5, USD),
    });
    expect(result.ok && result.value.defaultCurrency).toBe(USD);
    expect(result.ok && result.value.antExpenseThreshold).toEqual(Money.of(5, USD));
  });

  it('does not mutate the current settings', () => {
    const current = defaultSettings();
    applySettingsPatch(current, { theme: 'dark' });
    expect(current.theme).toBe('system');
  });
});
