import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { IDB_DATABASE } from '@pp/shared/di';
import { openPicaPicaDb, type ExpenseRecord } from '@pp/shared/persistence';
import { catalogRepositoryContract } from '../application/ports/catalog.repository.contract';
import { buildExpense, expenseRepositoryContract } from '../application/ports/expense.repository.contract';
import { seedCatalog } from '../application/use-cases/seed-catalog';
import { SEED_CATEGORIES } from '../domain/catalog.seeds';
import { IdbCatalogRepository } from './indexeddb/idb-catalog.repository';
import { IdbExpenseRepository } from './indexeddb/idb-expense.repository';
import { toExpense, toRecord } from './indexeddb/expense.mapper';
import { InMemoryCatalogRepository } from './memory/in-memory-catalog.repository';
import { InMemoryExpenseRepository } from './memory/in-memory-expense.repository';

let counter = 0;

const idbProviders = () => {
  const name = `expenses-test-${counter++}`;
  TestBed.configureTestingModule({
    providers: [
      IdbExpenseRepository,
      IdbCatalogRepository,
      { provide: IDB_DATABASE, useFactory: () => openPicaPicaDb(name) },
    ],
  });
};

expenseRepositoryContract('in-memory', () => new InMemoryExpenseRepository());
expenseRepositoryContract('IndexedDB', () => {
  idbProviders();
  return TestBed.inject(IdbExpenseRepository);
});

catalogRepositoryContract('in-memory', () => new InMemoryCatalogRepository());
catalogRepositoryContract('IndexedDB', () => {
  idbProviders();
  return TestBed.inject(IdbCatalogRepository);
});

describe('expense mapper', () => {
  it('stores the normalized place key and the local day for querying', () => {
    const expense = buildExpense({ place: 'Bodega Doña Rosa' as never });
    const record = toRecord(expense);
    expect(record.placeKey).toBe('bodega dona rosa');
    expect(record.occurredDay).toBe('2026-10-30');
    expect(record.amountMinor).toBe(900);
    expect(record.currency).toBe('PEN');
  });

  it('round-trips an expense', () => {
    const expense = buildExpense();
    expect(toExpense(toRecord(expense))).toEqual(expense);
  });

  it('skips records it cannot read safely', () => {
    const record: ExpenseRecord = { ...toRecord(buildExpense()), currency: 'NOPE' };
    expect(toExpense(record)).toBeNull();
    expect(toExpense({ ...toRecord(buildExpense()), amountMinor: 1.5 })).toBeNull();
  });
});

describe('IdbExpenseRepository resilience', () => {
  it('lists the readable expenses even when one stored record is corrupt', async () => {
    idbProviders();
    const repository = TestBed.inject(IdbExpenseRepository);
    const good = buildExpense();
    await repository.save(good);
    const db = await TestBed.inject(IDB_DATABASE);
    await db.put('expenses', { ...toRecord(buildExpense()), currency: 'NOPE' });
    expect((await repository.list()).map((e) => e.id)).toEqual([good.id]);
  });
});

describe('seedCatalog', () => {
  it('seeds once and never overwrites later edits', async () => {
    const repository = new InMemoryCatalogRepository();
    const now = new Date('2026-10-30T13:00:00-05:00');
    await seedCatalog(repository, now);
    await repository.saveCategory({ ...SEED_CATEGORIES[0], archived: true });

    await seedCatalog(repository, now);
    const categories = await repository.listCategories();
    expect(categories).toHaveLength(SEED_CATEGORIES.length);
    expect(categories.find((c) => c.id === SEED_CATEGORIES[0].id)?.archived).toBe(true);
  });

  it('does not reseed when the user archived everything', async () => {
    const repository = new InMemoryCatalogRepository();
    await seedCatalog(repository, new Date());
    for (const category of await repository.listCategories()) {
      await repository.saveCategory({ ...category, archived: true });
    }
    await seedCatalog(repository, new Date());
    expect((await repository.listCategories()).every((c) => c.archived)).toBe(true);
  });
});
