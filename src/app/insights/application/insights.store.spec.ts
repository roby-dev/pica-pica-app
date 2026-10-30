import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CLOCK } from '@pp/shared/di';
import { currency, type Money } from '@pp/shared/kernel';
import { FakeClock } from '@pp/shared/testing';
import type { SpendRecord } from '../domain/expense-analytics';
import { InsightsStore } from './insights.store';
import { INSIGHTS_SOURCE, type InsightsSource, type LabelInfo } from './ports/insights-source';

const PEN = currency('PEN');
const USD = currency('USD');

let n = 0;
const spend = (day: string, amountMinor: number, extra: Partial<SpendRecord> & { code?: typeof PEN } = {}): SpendRecord => ({
  id: `e${++n}`,
  what: 'Café',
  amount: { amountMinor, currency: extra.code ?? PEN },
  categoryId: 'food',
  paymentMethodId: 'cash',
  place: null,
  day,
  ...extra,
});

function setup(records: readonly SpendRecord[], now = new Date('2026-10-30T13:00:00-05:00')) {
  const source = {
    records: signal(records),
    loading: signal(false),
    threshold: signal<Money>({ amountMinor: 2000, currency: PEN }),
    defaultCurrency: signal(PEN),
    categories: signal<ReadonlyMap<string, LabelInfo>>(new Map([['food', { name: 'Comida', emoji: '🍔', color: 'peach' }]])),
    methods: signal<ReadonlyMap<string, LabelInfo>>(new Map([['cash', { name: 'Efectivo' }]])),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: INSIGHTS_SOURCE, useValue: source satisfies InsightsSource },
      { provide: CLOCK, useValue: new FakeClock(now) },
    ],
  });
  return { source, store: TestBed.inject(InsightsStore) };
}

describe('InsightsStore periods', () => {
  it('opens on the current month and cannot go into the future', () => {
    const { store } = setup([]);
    expect(store.period()).toBe('month');
    expect(store.range()).toEqual({ fromDay: '2026-10-01', toDay: '2026-10-31' });
    expect(store.canGoNext()).toBe(false);
    store.nextPeriod();
    expect(store.range().fromDay).toBe('2026-10-01');
  });

  it('walks back and forward by whole periods', () => {
    const { store } = setup([]);
    store.previousPeriod();
    expect(store.range()).toEqual({ fromDay: '2026-09-01', toDay: '2026-09-30' });
    expect(store.canGoNext()).toBe(true);
    store.nextPeriod();
    expect(store.range().fromDay).toBe('2026-10-01');
  });

  it('returns to today when the period kind changes', () => {
    const { store } = setup([]);
    store.previousPeriod();
    store.setPeriod('week');
    expect(store.range()).toEqual({ fromDay: '2026-10-26', toDay: '2026-11-01' });
  });
});

describe('InsightsStore numbers', () => {
  const records = [
    spend('2026-10-02', 500),
    spend('2026-10-10', 1500),
    spend('2026-10-20', 8000),
    spend('2026-09-15', 1000),
  ];

  it('totals the shown period and compares it with the previous one', () => {
    const { store } = setup(records);
    expect(store.totalMinor()).toBe(10_000);
    expect(store.count()).toBe(3);
    expect(store.previousTotalMinor()).toBe(1000);
    expect(store.trend()).toEqual({ deltaPct: 900, direction: 'up' });
  });

  it('averages per elapsed day and projects the month', () => {
    const { store } = setup(records);
    expect(store.dailyAverageMinor()).toBe(Math.round(10_000 / 30));
    expect(store.projectedMinor()).toBe(Math.round((10_000 / 30) * 31));
    store.previousPeriod();
    expect(store.projectedMinor()).toBeNull();
  });

  it('splits ant expenses, and the share follows the threshold live', () => {
    const { store, source } = setup(records);
    expect(store.ant().antTotalMinor).toBe(2000);
    expect(store.ant().antShare).toBeCloseTo(0.2);
    source.threshold.set({ amountMinor: 10_000, currency: PEN });
    expect(store.ant().antTotalMinor).toBe(10_000);
    expect(store.ant().antShare).toBe(1);
  });

  it('resolves category and method names, with a fallback for unknown ids', () => {
    const { store } = setup([...records, spend('2026-10-05', 300, { categoryId: 'gone', paymentMethodId: 'gone' })]);
    expect(store.categories().map((c) => c.label)).toEqual(['Comida', 'Sin categoría']);
    expect(store.categories()[0]).toMatchObject({ emoji: '🍔', color: 'peach' });
    expect(store.methods().map((m) => m.label)).toEqual(['Efectivo', 'Sin método']);
  });

  it('reports no data for an empty period', () => {
    const { store } = setup(records);
    store.setPeriod('week');
    expect(store.hasData()).toBe(false);
    expect(store.series()).toHaveLength(7);
    // The previous week had the 8000 expense on the 20th, so spending dropped to nothing.
    expect(store.trend()).toEqual({ deltaPct: -100, direction: 'down' });
  });
});

describe('InsightsStore currencies', () => {
  const records = [
    spend('2026-10-02', 500),
    spend('2026-10-03', 700),
    spend('2026-10-04', 12_000, { code: USD }),
  ];

  it('lists the currencies of the period and defaults to the user default', () => {
    const { store } = setup(records);
    expect(store.currencies()).toEqual([PEN, USD]);
    expect(store.currency()).toBe(PEN);
    expect(store.totalMinor()).toBe(1200);
  });

  it('switches currency without ever adding the two', () => {
    const { store } = setup(records);
    store.selectCurrency(USD);
    expect(store.currency()).toBe(USD);
    expect(store.totalMinor()).toBe(12_000);
    expect(store.ant().classified).toBe(false);
    expect(store.unclassified()).toBe(1);
    expect(store.topAnt()).toEqual([]);
  });

  it('falls back when the chosen currency has no spending in the shown period', () => {
    const { store } = setup([...records, spend('2026-09-10', 900, { code: USD })]);
    store.selectCurrency(USD);
    store.previousPeriod();
    expect(store.currencies()).toEqual([USD]);
    expect(store.currency()).toBe(USD);
    store.previousPeriod();
    expect(store.currency()).toBe(PEN);
  });

  it('uses the busiest currency when the default has no spending', () => {
    const { store } = setup([spend('2026-10-02', 900, { code: USD })]);
    expect(store.currency()).toBe(USD);
  });
});
