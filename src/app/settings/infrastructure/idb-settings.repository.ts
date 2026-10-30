import { Injectable, inject } from '@angular/core';
import { IDB_DATABASE } from '@pp/shared/di';
import { Money, parseCurrency } from '@pp/shared/kernel';
import type { SettingsRecord } from '@pp/shared/persistence';
import type { SettingsRepository } from '../application/ports/settings.repository';
import type { AppSettings } from '../domain/app-settings';

const KEY = 'app';

@Injectable()
export class IdbSettingsRepository implements SettingsRepository {
  private readonly database = inject(IDB_DATABASE);

  async load(): Promise<AppSettings | null> {
    const db = await this.database;
    const record = await db.get('settings', KEY);
    return record ? toDomain(record) : null;
  }

  async save(settings: AppSettings): Promise<void> {
    const db = await this.database;
    await db.put('settings', toRecord(settings));
  }
}

export function toRecord(settings: AppSettings): SettingsRecord {
  return {
    key: KEY,
    defaultCurrency: settings.defaultCurrency,
    antExpenseThreshold: {
      amountMinor: settings.antExpenseThreshold.amountMinor,
      currency: settings.antExpenseThreshold.currency,
    },
    theme: settings.theme,
    weekStartsOn: settings.weekStartsOn,
    lastBackupAt: settings.lastBackupAt,
  };
}

/** Validates through domain parsers; unreadable records are treated as "nothing saved". */
export function toDomain(record: SettingsRecord): AppSettings | null {
  const defaultCurrency = parseCurrency(record.defaultCurrency);
  const thresholdCurrency = parseCurrency(record.antExpenseThreshold.currency);
  if (!defaultCurrency.ok || !thresholdCurrency.ok) return null;
  if (!Number.isSafeInteger(record.antExpenseThreshold.amountMinor)) return null;

  return {
    defaultCurrency: defaultCurrency.value,
    antExpenseThreshold: Money.fromMinor(
      record.antExpenseThreshold.amountMinor,
      thresholdCurrency.value,
    ),
    theme: record.theme,
    weekStartsOn: 1,
    lastBackupAt: record.lastBackupAt,
  };
}
