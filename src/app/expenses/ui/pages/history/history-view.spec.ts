import { currency, toIsoWithOffset, type Money } from '@pp/shared/kernel';
import type { Category, PaymentMethod } from '../../../domain/category';
import type { Expense } from '../../../domain/expense';
import { categoryId, expenseId, paymentMethodId } from '../../../domain/ids';
import type { OccurredAt } from '../../../domain/occurred-at';
import type { PlaceName, Note } from '../../../domain/place-name';
import { filterHistory, toDayGroups, type HistoryViewContext } from './history-view';

const PEN = currency('PEN');
const USD = currency('USD');

const cafe: Category = { id: categoryId('c1'), name: 'Café', emoji: '☕', color: 'peach', archived: false, position: 0 };
const yape: PaymentMethod = { id: paymentMethodId('m1'), name: 'Yape', kind: 'wallet', archived: false, position: 0 };

function expense(id: string, what: string, amount: Money, occurredAt: string, extra: Partial<Expense> = {}): Expense {
  return {
    id: expenseId(id),
    what,
    amount,
    categoryId: cafe.id,
    paymentMethodId: yape.id,
    place: null,
    occurredAt: occurredAt as OccurredAt,
    note: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    deletedAt: null,
    ...extra,
  };
}

const context = (threshold: Money = { amountMinor: 2000, currency: PEN }): HistoryViewContext => ({
  now: new Date(2026, 9, 30, 15, 0),
  locale: 'es-PE',
  threshold,
  categories: new Map([[cafe.id, cafe]]),
  methods: new Map([[yape.id, yape]]),
});

const at = (day: number, hour = 10) => toIsoWithOffset(new Date(2026, 9, day, hour, 0));

describe('toDayGroups', () => {
  const items = [
    expense('1', 'Café', { amountMinor: 450, currency: PEN }, at(30, 12)),
    expense('2', 'Chicle', { amountMinor: 150, currency: PEN }, at(30, 9)),
    expense('3', 'Uber', { amountMinor: 1200, currency: USD }, at(30, 8)),
    expense('4', 'Pan', { amountMinor: 300, currency: PEN }, at(29, 8)),
    expense('5', 'Cine', { amountMinor: 3500, currency: PEN }, at(27, 20)),
  ];

  it('groups by local day, keeping the incoming newest-first order', () => {
    const groups = toDayGroups(items, context());
    expect(groups.map((g) => g.rows.map((r) => r.what))).toEqual([['Café', 'Chicle', 'Uber'], ['Pan'], ['Cine']]);
  });

  it('labels today and yesterday and spells out older days', () => {
    const labels = toDayGroups(items, context()).map((g) => g.dayLabel);
    expect(labels[0]).toBe('Hoy');
    expect(labels[1]).toBe('Ayer');
    expect(labels[2]).toMatch(/27/);
  });

  it('keeps day totals per currency and never mixes them', () => {
    const [today] = toDayGroups(items, context());
    expect(today.totals).toEqual([
      { amountMinor: 600, currency: PEN },
      { amountMinor: 1200, currency: USD },
    ]);
  });

  it('flags ant expenses only inside the threshold currency', () => {
    const rows = toDayGroups(items, context()).flatMap((g) => g.rows);
    const flag = (what: string) => rows.find((r) => r.what === what)!.isAnt;
    expect(flag('Café')).toBe(true);
    expect(flag('Cine')).toBe(false);
    expect(flag('Uber')).toBe(false); // 12.00 USD is below 20.00 but a different currency
  });

  it('fills category and method names, with a fallback for unknown ids', () => {
    const orphan = expense('9', 'Raro', { amountMinor: 100, currency: PEN }, at(30), {
      categoryId: categoryId('gone'),
      paymentMethodId: paymentMethodId('gone'),
    });
    const [row] = toDayGroups([orphan], context())[0].rows;
    expect(row.categoryName).toBe('Sin categoría');
    expect(row.methodName).toBe('');
    const [known] = toDayGroups([items[0]], context())[0].rows;
    expect(known.categoryName).toBe('Café');
    expect(known.categoryColor).toBe('peach');
    expect(known.methodName).toBe('Yape');
  });
});

describe('filterHistory', () => {
  const items = [
    expense('1', 'Café', { amountMinor: 450, currency: PEN }, at(30), { place: 'Bodega Don José' as PlaceName }),
    expense('2', 'Pasaje', { amountMinor: 250, currency: PEN }, at(30), {
      categoryId: categoryId('c2'),
      note: 'Camino al trabajo' as Note,
    }),
  ];

  it('returns everything for an empty filter', () => {
    expect(filterHistory(items, { query: '  ', categoryId: null })).toHaveLength(2);
  });

  it('searches what, place and note ignoring case and accents', () => {
    expect(filterHistory(items, { query: 'CAFE', categoryId: null }).map((e) => e.id)).toEqual(['1']);
    expect(filterHistory(items, { query: 'jose', categoryId: null }).map((e) => e.id)).toEqual(['1']);
    expect(filterHistory(items, { query: 'trabajo', categoryId: null }).map((e) => e.id)).toEqual(['2']);
  });

  it('combines the category filter with the search', () => {
    expect(filterHistory(items, { query: '', categoryId: 'c2' }).map((e) => e.id)).toEqual(['2']);
    expect(filterHistory(items, { query: 'cafe', categoryId: 'c2' })).toHaveLength(0);
  });
});
