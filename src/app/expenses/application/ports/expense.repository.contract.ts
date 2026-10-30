import { DEFAULT_CURRENCY, Money, currency } from '@pp/shared/kernel';
import { createExpense, type Expense } from '../../domain/expense';
import { expenseId } from '../../domain/ids';
import type { ExpenseRepository } from './expense.repository';

let sequence = 0;

/** Builds a valid expense for tests; override any field after creation. */
export function buildExpense(overrides: Partial<Expense> = {}): Expense {
  const id = overrides.id ?? expenseId(`e-${++sequence}`);
  const created = createExpense(
    {
      what: 'Café americano',
      amount: Money.of(9, DEFAULT_CURRENCY),
      categoryId: 'cat-cafe',
      paymentMethodId: 'pm-yape-plin',
      place: 'Starbucks',
      occurredAt: '2026-10-30T08:42:00-05:00',
      note: null,
    },
    { id, now: new Date('2026-10-30T13:00:00-05:00') },
  );
  if (!created.ok) throw created.error;
  return { ...created.value, ...overrides };
}

/** Behaviour every ExpenseRepository adapter (memory, IndexedDB, future HTTP) must share. */
export function expenseRepositoryContract(
  name: string,
  create: () => ExpenseRepository | Promise<ExpenseRepository>,
): void {
  describe(`ExpenseRepository contract: ${name}`, () => {
    it('starts empty and returns null for unknown ids', async () => {
      const repository = await create();
      expect(await repository.list()).toEqual([]);
      expect(await repository.get(expenseId('missing'))).toBeNull();
    });

    it('round-trips an expense with every field', async () => {
      const repository = await create();
      const expense = buildExpense({ note: null });
      await repository.save(expense);
      expect(await repository.get(expense.id)).toEqual(expense);
    });

    it('replaces an expense saved twice', async () => {
      const repository = await create();
      const expense = buildExpense();
      await repository.save(expense);
      await repository.save({ ...expense, what: 'Café con leche' });
      const all = await repository.list();
      expect(all).toHaveLength(1);
      expect(all[0].what).toBe('Café con leche');
    });

    it('lists newest first', async () => {
      const repository = await create();
      const older = buildExpense({ occurredAt: '2026-10-28T09:00:00-05:00' as Expense['occurredAt'] });
      const newer = buildExpense({ occurredAt: '2026-10-30T09:00:00-05:00' as Expense['occurredAt'] });
      await repository.saveMany([older, newer]);
      expect((await repository.list()).map((e) => e.id)).toEqual([newer.id, older.id]);
    });

    it('hides soft-deleted expenses unless asked, and restores them', async () => {
      const repository = await create();
      const expense = buildExpense();
      await repository.save(expense);

      await repository.softDelete(expense.id, '2026-10-30T15:00:00.000Z');
      expect(await repository.list()).toEqual([]);
      const withDeleted = await repository.list({ includeDeleted: true });
      expect(withDeleted[0].deletedAt).toBe('2026-10-30T15:00:00.000Z');
      expect(withDeleted[0].what).toBe(expense.what);

      await repository.restore(expense.id, '2026-10-30T15:00:05.000Z');
      const restored = await repository.list();
      expect(restored).toHaveLength(1);
      expect(restored[0].deletedAt).toBeNull();
      expect(restored[0].updatedAt).toBe('2026-10-30T15:00:05.000Z');
    });

    it('ignores deleting or restoring unknown ids', async () => {
      const repository = await create();
      await expect(repository.softDelete(expenseId('nope'), 'x')).resolves.toBeUndefined();
      await expect(repository.restore(expenseId('nope'), 'x')).resolves.toBeUndefined();
      expect(await repository.list({ includeDeleted: true })).toEqual([]);
    });

    it('filters by inclusive local day range', async () => {
      const repository = await create();
      const days = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];
      await repository.saveMany(
        days.map((day) => buildExpense({ occurredAt: `${day}T23:30:00-05:00` as Expense['occurredAt'] })),
      );
      const result = await repository.list({ fromDay: '2026-10-28', toDay: '2026-10-29' });
      expect(result.map((e) => e.occurredAt.slice(0, 10)).sort()).toEqual(['2026-10-28', '2026-10-29']);
    });

    it('filters by currency without mixing them', async () => {
      const repository = await create();
      const pen = buildExpense();
      const usd = buildExpense({ amount: Money.of(5, currency('USD')) });
      await repository.saveMany([pen, usd]);
      expect((await repository.list({ currency: currency('USD') })).map((e) => e.id)).toEqual([usd.id]);
      expect((await repository.list({ currency: DEFAULT_CURRENCY })).map((e) => e.id)).toEqual([pen.id]);
    });

    it('imports many expenses at once, replacing duplicates', async () => {
      const repository = await create();
      const first = buildExpense();
      await repository.save(first);
      await repository.saveMany([{ ...first, what: 'Replaced' }, buildExpense()]);
      expect(await repository.list()).toHaveLength(2);
      expect((await repository.get(first.id))?.what).toBe('Replaced');
    });
  });
}
