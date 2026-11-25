import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { IDB_DATABASE } from '@pp/shared/di';
import { Money, currency } from '@pp/shared/kernel';
import { openPicaPicaDb } from '@pp/shared/persistence';
import { settingsRepositoryContract } from '../application/ports/settings.repository.contract';
import { IdbSettingsRepository, toDomain } from './idb-settings.repository';
import { InMemorySettingsRepository } from './in-memory-settings.repository';

let counter = 0;

settingsRepositoryContract('in-memory', () => new InMemorySettingsRepository());

settingsRepositoryContract('IndexedDB', () => {
  TestBed.configureTestingModule({
    providers: [
      IdbSettingsRepository,
      { provide: IDB_DATABASE, useFactory: () => openPicaPicaDb(`settings-test-${counter++}`) },
    ],
  });
  return TestBed.inject(IdbSettingsRepository);
});

describe('IdbSettingsRepository mapping', () => {
  const legacy = {
    key: 'app' as const,
    defaultCurrency: 'PEN',
    antExpenseThreshold: { amountMinor: 2000, currency: 'PEN' },
    theme: 'system' as const,
    weekStartsOn: 1 as const,
    lastBackupAt: null,
  };

  it('loads a v1 record without caps and persists explicit caps at the same version', async () => {
    const db = await openPicaPicaDb(`settings-test-${counter++}`);
    try {
      TestBed.configureTestingModule({ providers: [
        IdbSettingsRepository, { provide: IDB_DATABASE, useValue: Promise.resolve(db) },
      ] });
      const repository = TestBed.inject(IdbSettingsRepository);
      await db.put('settings', legacy);
      const settings = (await repository.load())!;
      expect(settings).toEqual({
        defaultCurrency: 'PEN', antExpenseThreshold: legacy.antExpenseThreshold,
        theme: 'system', weekStartsOn: 1, lastBackupAt: null,
      });
      const weeklyBudgets = [Money.of(150, currency('PEN')), Money.of(40, currency('USD'))];
      const updated = { ...settings, weeklyBudgets };
      await repository.save(updated);
      expect(db.version).toBe(1);
      expect(await db.get('settings', 'app')).toEqual({ ...legacy, weeklyBudgets });
      expect(await repository.load()).toEqual({ ...settings, weeklyBudgets });
    } finally {
      db.close();
    }
  });

  it('treats records with an unknown default currency as unreadable', () => {
    expect(toDomain({ ...legacy, defaultCurrency: 'NOPE' })).toBeNull();
  });
});
