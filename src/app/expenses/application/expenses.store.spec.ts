import { TestBed } from '@angular/core/testing';
import { provideSettings, SettingsStore } from '@pp/settings';
import { CLOCK, ID_GENERATOR } from '@pp/shared/di';
import { Money, currency } from '@pp/shared/kernel';
import { FakeClock, SequentialIdGenerator } from '@pp/shared/testing';
import { ExpensePersistenceError } from '../domain/expense.errors';
import { InMemoryCatalogRepository } from '../infrastructure/memory/in-memory-catalog.repository';
import { InMemoryExpenseRepository } from '../infrastructure/memory/in-memory-expense.repository';
import { CatalogStore } from './catalog.store';
import { ExpensesStore } from './expenses.store';
import { CATALOG_REPOSITORY } from './ports/catalog.repository';
import { EXPENSE_REPOSITORY, type ExpenseRepository } from './ports/expense.repository';
import { seedCatalog } from './use-cases/seed-catalog';
import type { ExpenseCommand } from './use-cases/add-expense';

const NOW = new Date('2026-10-30T13:00:00-05:00');

const command = (overrides: Partial<ExpenseCommand> = {}): ExpenseCommand => ({
  what: 'Café americano',
  amountMinor: 900,
  categoryId: 'cat-cafe',
  paymentMethodId: 'pm-yape-plin',
  place: 'Starbucks',
  occurredAt: '2026-10-30T08:42:00-05:00',
  ...overrides,
});

async function setup(repository: ExpenseRepository = new InMemoryExpenseRepository()) {
  const catalogRepository = new InMemoryCatalogRepository();
  await seedCatalog(catalogRepository, NOW);
  TestBed.configureTestingModule({
    providers: [
      provideSettings({ persistence: 'memory' }),
      { provide: EXPENSE_REPOSITORY, useValue: repository },
      { provide: CATALOG_REPOSITORY, useValue: catalogRepository },
      { provide: CLOCK, useValue: new FakeClock(NOW) },
      { provide: ID_GENERATOR, useValue: new SequentialIdGenerator() },
    ],
  });
  const store = TestBed.inject(ExpensesStore);
  const catalog = TestBed.inject(CatalogStore);
  const settings = TestBed.inject(SettingsStore);
  await vi.waitFor(() => expect(catalog.ready() && settings.ready()).toBe(true));
  await vi.waitFor(() => expect(store.isLoading()).toBe(false));
  return { store, catalog, settings, repository };
}

/** A repository whose writes can be held back or made to fail. */
class ControlledRepository extends InMemoryExpenseRepository {
  fail = false;
  release: (() => void) | null = null;
  hold = false;

  override async save(expense: Parameters<InMemoryExpenseRepository['save']>[0]): Promise<void> {
    if (this.hold) await new Promise<void>((resolve) => (this.release = resolve));
    if (this.fail) throw new Error('disk full');
    return super.save(expense);
  }
}

describe('ExpensesStore.add', () => {
  it('saves a valid expense and defaults to the settings currency', async () => {
    const { store, repository } = await setup();
    const result = await store.add(command());
    expect(result.ok).toBe(true);
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0].amount).toEqual({ amountMinor: 900, currency: 'PEN' });
    expect(await repository.list()).toHaveLength(1);
  });

  it('uses the new default currency after the user changes it', async () => {
    const { store, settings } = await setup();
    const usd = currency('USD');
    await settings.update({ defaultCurrency: usd, antExpenseThreshold: Money.of(5, usd) });
    const result = await store.add(command());
    expect(result.ok && result.value.amount.currency).toBe('USD');
  });

  it('shows the expense immediately, before storage answers (optimistic)', async () => {
    const repository = new ControlledRepository();
    const { store } = await setup(repository);
    repository.hold = true;
    const pending = store.add(command());
    expect(store.all()).toHaveLength(1);
    repository.release?.();
    expect((await pending).ok).toBe(true);
  });

  it('rolls back and reports a persistence error when storage fails', async () => {
    const repository = new ControlledRepository();
    const { store } = await setup(repository);
    await store.add(command({ what: 'Primero' }));
    repository.fail = true;
    const result = await store.add(command({ what: 'Segundo' }));
    expect(!result.ok && result.error).toBeInstanceOf(ExpensePersistenceError);
    expect(store.all().map((e) => e.what)).toEqual(['Primero']);
  });

  it('rejects invalid input without touching the list', async () => {
    const { store } = await setup();
    const result = await store.add(command({ what: '' }));
    expect(result.ok).toBe(false);
    expect(store.all()).toEqual([]);
  });

  it('rejects an archived category (rule 6)', async () => {
    const { store, catalog } = await setup();
    await catalog.setCategoryArchived('cat-cafe' as never, true);
    const result = await store.add(command());
    expect(result.ok).toBe(false);
  });
});

describe('ExpensesStore.update', () => {
  it('replaces the expense in place', async () => {
    const { store } = await setup();
    const added = await store.add(command());
    if (!added.ok) throw added.error;
    const result = await store.update(added.value.id, command({ what: 'Café con leche', amountMinor: 1100 }));
    expect(result.ok).toBe(true);
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0]).toMatchObject({ what: 'Café con leche', amount: { amountMinor: 1100 } });
  });

  it('lets an old expense keep its archived category', async () => {
    const { store, catalog } = await setup();
    const added = await store.add(command());
    if (!added.ok) throw added.error;
    await catalog.setCategoryArchived('cat-cafe' as never, true);
    const result = await store.update(added.value.id, command({ note: 'sin azúcar' }));
    expect(result.ok).toBe(true);
  });

  it('reports an unknown id', async () => {
    const { store } = await setup();
    expect((await store.update('nope' as never, command())).ok).toBe(false);
  });
});

describe('ExpensesStore.remove and undo (rule 7)', () => {
  it('soft deletes, hides the expense and can undo', async () => {
    const { store, repository } = await setup();
    const added = await store.add(command());
    if (!added.ok) throw added.error;

    const removed = await store.remove(added.value.id);
    expect(removed.ok).toBe(true);
    expect(store.all()).toEqual([]);
    expect(store.lastDeleted()?.id).toBe(added.value.id);
    expect(await repository.list()).toEqual([]);
    expect(await repository.list({ includeDeleted: true })).toHaveLength(1);

    const undone = await store.undoRemove();
    expect(undone.ok).toBe(true);
    expect(store.all().map((e) => e.id)).toEqual([added.value.id]);
    expect(store.lastDeleted()).toBeNull();
    expect(await repository.list()).toHaveLength(1);
  });

  it('keeps newest-first order after an undo', async () => {
    const { store } = await setup();
    const older = await store.add(command({ what: 'Antes', occurredAt: '2026-10-28T09:00:00-05:00' }));
    const newer = await store.add(command({ what: 'Después', occurredAt: '2026-10-30T09:00:00-05:00' }));
    if (!older.ok || !newer.ok) throw new Error('setup failed');
    await store.remove(newer.value.id);
    await store.undoRemove();
    expect(store.all().map((e) => e.what)).toEqual(['Después', 'Antes']);
  });

  it('has nothing to undo after dismissing', async () => {
    const { store } = await setup();
    const added = await store.add(command());
    if (!added.ok) throw added.error;
    await store.remove(added.value.id);
    store.dismissUndo();
    expect((await store.undoRemove()).ok).toBe(false);
  });
});

describe('ExpensesStore derived data', () => {
  it('lists distinct recent whats and places, newest first', async () => {
    const { store } = await setup();
    await store.add(command({ what: 'Café', place: 'Starbucks', occurredAt: '2026-10-28T09:00:00-05:00' }));
    await store.add(command({ what: 'Galletas', place: 'Bodega Lola', occurredAt: '2026-10-29T09:00:00-05:00' }));
    await store.add(command({ what: 'Café', place: 'Starbucks', occurredAt: '2026-10-30T09:00:00-05:00' }));
    expect(store.recentWhats()).toEqual(['Café', 'Galletas']);
    expect(store.recentPlaces()).toEqual(['Starbucks', 'Bodega Lola']);
  });

  it('totals today and this week per currency, never mixing them', async () => {
    const { store } = await setup();
    await store.add(command({ amountMinor: 900 }));
    await store.add(command({ amountMinor: 150 }));
    await store.add(command({ amountMinor: 500, currency: currency('USD') }));
    await store.add(command({ amountMinor: 700, occurredAt: '2026-10-28T09:00:00-05:00' })); // earlier this week
    await store.add(command({ amountMinor: 999, occurredAt: '2026-10-20T09:00:00-05:00' })); // previous week

    const pen = currency('PEN');
    expect(store.todayTotals().get(pen)).toBe(1050);
    expect(store.todayTotals().get(currency('USD'))).toBe(500);
    expect(store.weekTotals().get(pen)).toBe(1750);
  });
});

describe('ExpensesStore.importMany', () => {
  const imported = (id: string, overrides: Partial<ExpenseCommand> = {}) => ({ ...command(overrides), id });

  it('saves every valid command keeping the given id and reports the counts', async () => {
    const { store, repository } = await setup();
    const summary = await store.importMany([imported('x1'), imported('x2', { what: 'Pan' }), imported('x3', { what: '' })]);
    expect(summary).toEqual({ imported: 2, duplicates: 0, invalid: 1 });
    expect(store.all().map((e) => e.id).sort()).toEqual(['x1', 'x2']);
    expect((await repository.list()).length).toBe(2);
  });

  it('is idempotent: importing the same ids again adds nothing', async () => {
    const { store } = await setup();
    await store.importMany([imported('x1')]);
    const again = await store.importMany([imported('x1')]);
    expect(again).toEqual({ imported: 0, duplicates: 1, invalid: 0 });
    expect(store.all().length).toBe(1);
  });
});

describe('ExpensesStore ordering', () => {
  it('keeps the list newest-occurred first when adding a back-dated expense', async () => {
    const { store } = await setup();
    await store.add(command({ what: 'Hoy', occurredAt: '2026-10-30T08:00:00-05:00' }));
    await store.add(command({ what: 'Ayer', occurredAt: '2026-10-29T08:00:00-05:00' }));
    await store.add(command({ what: 'Hoy tarde', occurredAt: '2026-10-30T12:00:00-05:00' }));
    expect(store.all().map((e) => e.what)).toEqual(['Hoy tarde', 'Hoy', 'Ayer']);
  });

  it('re-sorts when an expense changes date', async () => {
    const { store } = await setup();
    const first = await store.add(command({ what: 'A', occurredAt: '2026-10-30T08:00:00-05:00' }));
    await store.add(command({ what: 'B', occurredAt: '2026-10-29T08:00:00-05:00' }));
    if (!first.ok) throw first.error;
    await store.update(first.value.id, command({ what: 'A', occurredAt: '2026-10-20T08:00:00-05:00' }));
    expect(store.all().map((e) => e.what)).toEqual(['B', 'A']);
  });
});
