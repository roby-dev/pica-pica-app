import { TestBed } from '@angular/core/testing';
import { CATALOG_REPOSITORY, CatalogStore, EXPENSE_REPOSITORY, ExpensesStore, SEED_CATEGORIES } from '@pp/expenses';
import { provideSettings, SettingsStore } from '@pp/settings';
import { CLOCK, ID_GENERATOR } from '@pp/shared/di';
import { FakeClock, SequentialIdGenerator } from '@pp/shared/testing';
import { InMemoryCatalogRepository } from '../../expenses/infrastructure/memory/in-memory-catalog.repository';
import { InMemoryExpenseRepository } from '../../expenses/infrastructure/memory/in-memory-expense.repository';
import { seedCatalog } from '../../expenses/application/use-cases/seed-catalog';
import { BackupService } from './backup.service';

const NOW = new Date('2026-10-30T13:00:00-05:00');

async function device() {
  TestBed.resetTestingModule();
  const catalogRepository = new InMemoryCatalogRepository();
  TestBed.configureTestingModule({
    providers: [
      provideSettings({ persistence: 'memory' }),
      { provide: EXPENSE_REPOSITORY, useValue: new InMemoryExpenseRepository() },
      { provide: CATALOG_REPOSITORY, useValue: catalogRepository },
      { provide: CLOCK, useValue: new FakeClock(NOW) },
      { provide: ID_GENERATOR, useValue: new SequentialIdGenerator() },
    ],
  });
  return { catalogRepository };
}

async function ready() {
  const expenses = TestBed.inject(ExpensesStore);
  const catalog = TestBed.inject(CatalogStore);
  const settings = TestBed.inject(SettingsStore);
  await vi.waitFor(() => expect(catalog.ready() && settings.ready() && !expenses.isLoading()).toBe(true));
  return { expenses, catalog, settings, backup: TestBed.inject(BackupService) };
}

describe('BackupService', () => {
  it('restores a backup on an empty device, and a second restore adds nothing', async () => {
    const source = await device();
    await seedCatalog(source.catalogRepository, NOW);
    const a = await ready();
    await a.expenses.add({ what: 'Café', amountMinor: 900, categoryId: SEED_CATEGORIES[0].id, paymentMethodId: 'pm-efectivo', occurredAt: '2026-10-30T08:00:00-05:00', place: 'Starbucks' });
    await a.catalog.renameCategory(SEED_CATEGORIES[1].id, 'Golosinas');
    await a.settings.update({ theme: 'light' });
    const text = JSON.stringify(a.backup.createBackup());

    await device();
    const b = await ready();
    const first = await b.backup.restore(text);
    expect(first.ok && first.value).toMatchObject({ imported: 1, duplicates: 0, invalid: 0, categories: SEED_CATEGORIES.length, methods: 5 });
    expect(b.expenses.all()[0]).toMatchObject({ what: 'Café', place: 'Starbucks' });
    expect(b.catalog.categoryById().get(SEED_CATEGORIES[1].id)?.name).toBe('Golosinas');
    expect(b.settings.theme()).toBe('light');

    const second = await b.backup.restore(text);
    expect(second.ok && second.value).toMatchObject({ imported: 0, duplicates: 1, categories: 0, methods: 0 });
    expect(b.expenses.all().length).toBe(1);
  });

  it('refuses a file that is not a backup and changes nothing', async () => {
    await device();
    const { backup, expenses } = await ready();
    expect((await backup.restore('{"x":1}')).ok).toBe(false);
    expect(expenses.all()).toEqual([]);
  });
});
