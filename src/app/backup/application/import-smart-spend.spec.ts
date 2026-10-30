import { TestBed } from '@angular/core/testing';
import { CATALOG_REPOSITORY, CatalogStore, EXPENSE_REPOSITORY, ExpensesStore } from '@pp/expenses';
import { provideSettings } from '@pp/settings';
import { CLOCK, ID_GENERATOR } from '@pp/shared/di';
import { FakeClock, SequentialIdGenerator } from '@pp/shared/testing';
import { InMemoryCatalogRepository } from '../../expenses/infrastructure/memory/in-memory-catalog.repository';
import { InMemoryExpenseRepository } from '../../expenses/infrastructure/memory/in-memory-expense.repository';
import { ImportSmartSpend } from './import-smart-spend';

const file = JSON.stringify([
  {
    titulo: 'Mercado septiembre',
    detalles: [
      { uuid: 'a', nombre: 'Pollo', precio: 26, fecha: '2026-09-07T09:29:11.000000' },
      { uuid: 'b', nombre: 'Sin precio', precio: 0, fecha: '2026-09-07T09:30:00.000000' },
    ],
  },
]);

describe('ImportSmartSpend', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideSettings({ persistence: 'memory' }),
        { provide: EXPENSE_REPOSITORY, useValue: new InMemoryExpenseRepository() },
        // An install that predates the Mercado seed: empty catalog.
        { provide: CATALOG_REPOSITORY, useValue: new InMemoryCatalogRepository() },
        { provide: CLOCK, useValue: new FakeClock(new Date('2026-10-30T13:00:00-05:00')) },
        { provide: ID_GENERATOR, useValue: new SequentialIdGenerator() },
      ],
    });
    const expenses = TestBed.inject(ExpensesStore);
    const catalog = TestBed.inject(CatalogStore);
    await vi.waitFor(() => expect(catalog.ready() && !expenses.isLoading()).toBe(true));
    return { expenses, catalog, importer: TestBed.inject(ImportSmartSpend) };
  }

  it('creates Mercado when missing and imports priced items as cash expenses', async () => {
    const { expenses, catalog, importer } = await setup();
    const result = await importer.run(file);
    expect(result.ok && result.value).toEqual({ imported: 1, duplicates: 0, invalid: 0, skipped: 1 });
    expect(catalog.categories().map((c) => c.name)).toContain('Mercado');
    const [expense] = expenses.all();
    expect(expense).toMatchObject({
      id: 'a',
      what: 'Pollo',
      place: 'Mercado septiembre',
      occurredAt: '2026-09-07T09:29:11-05:00',
      amount: { amountMinor: 2600 },
      categoryId: 'cat-mercado',
      paymentMethodId: 'pm-efectivo',
    });
  });

  it('rejects a file that is not a Smart Spend backup', async () => {
    const { importer } = await setup();
    expect((await importer.run('{"x":1}')).ok).toBe(false);
  });
});
