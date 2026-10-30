import { DEFAULT_CURRENCY, Money, currency } from '@pp/shared/kernel';
import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from './catalog.seeds';
import { ensurePickable } from './category';
import { ArchivedCatalogItemError, ExpenseValidationError } from './expense.errors';
import {
  createExpense,
  isActive,
  restoreExpense,
  softDeleteExpense,
  updateExpense,
  type ExpenseInput,
} from './expense';

const NOW = new Date('2026-10-30T13:00:00-05:00');
const ctx = { id: 'e-1', now: NOW };

const valid = (overrides: Partial<ExpenseInput> = {}): ExpenseInput => ({
  what: 'Café americano',
  amount: Money.of(9, DEFAULT_CURRENCY),
  categoryId: 'cat-cafe',
  paymentMethodId: 'pm-yape-plin',
  place: 'Starbucks Larcomar',
  occurredAt: '2026-10-30T08:42:00-05:00',
  note: null,
  ...overrides,
});

const failure = (overrides: Partial<ExpenseInput>) => {
  const result = createExpense(valid(overrides), ctx);
  if (result.ok) throw new Error('expected a validation error');
  return result.error;
};

describe('createExpense (rule 1)', () => {
  it('builds a complete expense with timestamps and no deletion', () => {
    const result = createExpense(valid(), ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      id: 'e-1',
      what: 'Café americano',
      amount: { amountMinor: 900, currency: 'PEN' },
      place: 'Starbucks Larcomar',
      note: null,
      deletedAt: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it('trims text and treats empty place and note as absent', () => {
    const result = createExpense(valid({ what: '  Galletas  ', place: '   ', note: '' }), ctx);
    expect(result.ok && result.value.what).toBe('Galletas');
    expect(result.ok && result.value.place).toBeNull();
    expect(result.ok && result.value.note).toBeNull();
  });

  it.each([
    ['what', { what: '   ' }],
    ['what', { what: 'x'.repeat(61) }],
    ['amount', { amount: Money.zero(DEFAULT_CURRENCY) }],
    ['amount', { amount: Money.fromMinor(-5, DEFAULT_CURRENCY) }],
    ['amount', { amount: Money.fromMinor(1e12 + 1, DEFAULT_CURRENCY) }],
    ['category', { categoryId: '' }],
    ['paymentMethod', { paymentMethodId: ' ' }],
    ['place', { place: 'p'.repeat(61) }],
    ['note', { note: 'n'.repeat(281) }],
    ['occurredAt', { occurredAt: 'ayer' }],
    ['occurredAt', { occurredAt: '2026-10-30T08:42:00' }],
  ] as const)('rejects an invalid %s', (field, overrides) => {
    const error = failure(overrides);
    expect(error).toBeInstanceOf(ExpenseValidationError);
    expect(error.field).toBe(field);
  });

  it('accepts the amount limits', () => {
    expect(createExpense(valid({ amount: Money.fromMinor(1, DEFAULT_CURRENCY) }), ctx).ok).toBe(true);
    expect(createExpense(valid({ amount: Money.fromMinor(1e12, DEFAULT_CURRENCY) }), ctx).ok).toBe(true);
  });

  it('allows up to a day ahead but not further', () => {
    expect(createExpense(valid({ occurredAt: '2026-10-31T10:00:00-05:00' }), ctx).ok).toBe(true);
    expect(failure({ occurredAt: '2026-11-02T10:00:00-05:00' }).field).toBe('occurredAt');
  });
});

describe('multi-currency (rule 2)', () => {
  it('keeps the currency of each expense', () => {
    const usd = createExpense(valid({ amount: Money.of(5, currency('USD')) }), ctx);
    const pen = createExpense(valid(), { ...ctx, id: 'e-2' });
    expect(usd.ok && usd.value.amount.currency).toBe('USD');
    expect(pen.ok && pen.value.amount.currency).toBe('PEN');
  });
});

describe('updateExpense', () => {
  it('replaces fields but keeps identity and creation time', () => {
    const created = createExpense(valid(), ctx);
    if (!created.ok) throw created.error;
    const later = new Date('2026-10-30T15:00:00-05:00');
    const updated = updateExpense(created.value, valid({ what: 'Café con leche' }), later);
    expect(updated.ok && updated.value.id).toBe('e-1');
    expect(updated.ok && updated.value.what).toBe('Café con leche');
    expect(updated.ok && updated.value.createdAt).toBe(NOW.toISOString());
    expect(updated.ok && updated.value.updatedAt).toBe(later.toISOString());
  });

  it('rejects invalid input and leaves the original usable', () => {
    const created = createExpense(valid(), ctx);
    if (!created.ok) throw created.error;
    const updated = updateExpense(created.value, valid({ what: '' }), NOW);
    expect(updated.ok).toBe(false);
  });
});

describe('soft delete (rule 7)', () => {
  it('marks and restores without losing data', () => {
    const created = createExpense(valid(), ctx);
    if (!created.ok) throw created.error;
    const later = new Date('2026-10-30T15:00:00-05:00');
    const deleted = softDeleteExpense(created.value, later);
    expect(isActive(deleted)).toBe(false);
    expect(deleted.deletedAt).toBe(later.toISOString());
    expect(deleted.what).toBe(created.value.what);

    const restored = restoreExpense(deleted, later);
    expect(isActive(restored)).toBe(true);
    expect(restored.deletedAt).toBeNull();
  });
});

describe('catalog (rule 6)', () => {
  it('rejects archived items for new expenses', () => {
    const archived = { ...SEED_CATEGORIES[0], archived: true };
    const result = ensurePickable(archived);
    expect(!result.ok && result.error).toBeInstanceOf(ArchivedCatalogItemError);
    expect(ensurePickable(SEED_CATEGORIES[0]).ok).toBe(true);
  });

  it('seeds the Peru catalog with unique stable ids', () => {
    expect(SEED_CATEGORIES.map((c) => c.name)).toEqual([
      'Café', 'Snacks', 'Transporte', 'Delivery', 'Suscripciones', 'Antojos', 'Bodega', 'Mercado', 'Otros',
    ]);
    expect(SEED_PAYMENT_METHODS.map((m) => m.name)).toEqual([
      'Efectivo', 'Débito', 'Crédito', 'Yape/Plin', 'Transferencia',
    ]);
    const ids = [...SEED_CATEGORIES, ...SEED_PAYMENT_METHODS].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SEED_CATEGORIES.every((c) => !c.archived)).toBe(true);
  });
});
