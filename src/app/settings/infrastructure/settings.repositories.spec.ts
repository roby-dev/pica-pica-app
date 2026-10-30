import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { IDB_DATABASE } from '@pp/shared/di';
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
  it('treats records with an unknown currency as unreadable', () => {
    const record = {
      key: 'app' as const,
      defaultCurrency: 'NOPE',
      antExpenseThreshold: { amountMinor: 2000, currency: 'PEN' },
      theme: 'system' as const,
      weekStartsOn: 1 as const,
      lastBackupAt: null,
    };
    expect(toDomain(record)).toBeNull();
  });
});
