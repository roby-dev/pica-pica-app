import { currency, type Money } from '@pp/shared/kernel';
import {
  antSplit,
  bucketSeries,
  byCategory,
  byPlace,
  currenciesIn,
  dailyAverageMinor,
  isAntExpense,
  projectedTotalMinor,
  recordsIn,
  sumMinor,
  topAnt,
  trend,
  unclassifiedCount,
  type SpendRecord,
} from './expense-analytics';
import { rangeFor } from './period';

const PEN = currency('PEN');
const USD = currency('USD');
const threshold: Money = { amountMinor: 2000, currency: PEN };

let n = 0;
const spend = (day: string, amountMinor: number, extra: Partial<SpendRecord> & { code?: typeof PEN } = {}): SpendRecord => ({
  id: `e${++n}`,
  what: 'Café',
  amount: { amountMinor, currency: extra.code ?? PEN },
  categoryId: 'c1',
  paymentMethodId: 'm1',
  place: null,
  day,
  ...extra,
});

const october = rangeFor('month', '2026-10-15');

describe('currencies are never mixed', () => {
  const records = [
    spend('2026-10-01', 500),
    spend('2026-10-02', 700),
    spend('2026-10-02', 1500, { code: USD }),
    spend('2026-10-03', 900, { code: USD }),
    spend('2026-10-04', 300, { code: USD }),
  ];

  it('filters by currency and range before summing', () => {
    expect(sumMinor(recordsIn(records, october, PEN))).toBe(1200);
    expect(sumMinor(recordsIn(records, october, USD))).toBe(2700);
  });

  it('lists the currencies present, most used first', () => {
    expect(currenciesIn(records, october)).toEqual([USD, PEN]);
    expect(currenciesIn(records, rangeFor('month', '2026-09-01'))).toEqual([]);
  });

  it('ranks and buckets only inside the requested currency', () => {
    const series = bucketSeries(records, 'month', october, USD);
    expect(series.reduce((sum, p) => sum + p.totalMinor, 0)).toBe(2700);
    expect(byCategory(recordsIn(records, october, PEN))[0].totalMinor).toBe(1200);
  });

  it('cannot classify ant expenses outside the threshold currency and says how many are left out', () => {
    const split = antSplit(records, USD, threshold);
    expect(split).toEqual({ classified: false, antTotalMinor: 0, antCount: 0, antShare: null });
    expect(topAnt(records, USD, threshold)).toEqual([]);
    expect(unclassifiedCount(records, threshold)).toBe(3);
  });
});

describe('bucketSeries', () => {
  it('returns one point per day with zeros, so the chart keeps its shape', () => {
    const series = bucketSeries([spend('2026-10-02', 400), spend('2026-10-02', 100)], 'month', october, PEN);
    expect(series).toHaveLength(31);
    expect(series[1]).toEqual({ key: '2026-10-02', totalMinor: 500, count: 2 });
    expect(series[0].totalMinor).toBe(0);
  });

  it('returns seven days for a week and twelve months for a year', () => {
    expect(bucketSeries([], 'week', rangeFor('week', '2026-10-30'), PEN)).toHaveLength(7);
    const year = bucketSeries([spend('2026-03-10', 100), spend('2026-03-20', 200)], 'year', rangeFor('year', '2026-01-01'), PEN);
    expect(year).toHaveLength(12);
    expect(year[2]).toEqual({ key: '2026-03', totalMinor: 300, count: 2 });
  });
});

describe('pace', () => {
  it('averages over the days that have elapsed, not the whole month', () => {
    expect(dailyAverageMinor(1000, october, '2026-10-10')).toBe(100);
    expect(dailyAverageMinor(1000, october, '2026-09-01')).toBe(0);
  });

  it('projects the period from the current pace, and only while it is running', () => {
    expect(projectedTotalMinor(1000, october, '2026-10-10')).toBe(3100);
    expect(projectedTotalMinor(1000, october, '2026-10-31')).toBeNull();
    expect(projectedTotalMinor(1000, october, '2026-09-30')).toBeNull();
  });
});

describe('rankings', () => {
  it('ranks by total, then by count, with shares that add up to one', () => {
    const items = byCategory([
      spend('2026-10-01', 300, { categoryId: 'a' }),
      spend('2026-10-01', 100, { categoryId: 'b' }),
      spend('2026-10-02', 100, { categoryId: 'b' }),
      spend('2026-10-02', 600, { categoryId: 'c' }),
    ]);
    expect(items.map((i) => i.key)).toEqual(['c', 'a', 'b']);
    expect(items.reduce((sum, i) => sum + i.share, 0)).toBeCloseTo(1);
    expect(items[0].share).toBeCloseTo(600 / 1100);
  });

  it('groups places ignoring case and spacing, and skips expenses without a place', () => {
    const items = byPlace([
      spend('2026-10-01', 300, { place: 'Bodega Don José' }),
      spend('2026-10-02', 200, { place: ' bodega don josé ' }),
      spend('2026-10-03', 900),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ label: 'Bodega Don José', totalMinor: 500, count: 2 });
  });

  it('gives shares of zero instead of dividing by zero', () => {
    expect(byCategory([])).toEqual([]);
  });
});

describe('ant expenses', () => {
  it('counts amounts at or below the threshold, and only in its currency', () => {
    expect(isAntExpense({ amountMinor: 2000, currency: PEN }, threshold)).toBe(true);
    expect(isAntExpense({ amountMinor: 2001, currency: PEN }, threshold)).toBe(false);
    expect(isAntExpense({ amountMinor: 100, currency: USD }, threshold)).toBe(false);
  });

  it('splits the total between ant and bigger expenses', () => {
    const split = antSplit([spend('2026-10-01', 500), spend('2026-10-02', 1500), spend('2026-10-03', 8000)], PEN, threshold);
    expect(split.classified).toBe(true);
    expect(split.antTotalMinor).toBe(2000);
    expect(split.antCount).toBe(2);
    expect(split.antShare).toBeCloseTo(0.2);
  });

  it('has no share when nothing was spent', () => {
    expect(antSplit([], PEN, threshold)).toMatchObject({ classified: true, antShare: null });
  });

  it('surfaces repeated small purchases first, even when a one-off cost more', () => {
    const items = topAnt(
      [
        spend('2026-10-01', 450, { what: 'Café', place: 'Starbucks' }),
        spend('2026-10-02', 450, { what: 'café', place: 'starbucks' }),
        spend('2026-10-03', 450, { what: 'Café', place: 'Starbucks' }),
        spend('2026-10-03', 1900, { what: 'Snack', place: 'Bodega' }),
        spend('2026-10-04', 5000, { what: 'Cena' }),
      ],
      PEN,
      threshold,
    );
    expect(items.map((i) => i.what)).toEqual(['Café', 'Snack']);
    expect(items[0]).toMatchObject({ count: 3, totalMinor: 1350, place: 'Starbucks' });
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => spend('2026-10-01', 100 + i, { what: `Item ${i}` }));
    expect(topAnt(many, PEN, threshold, 3)).toHaveLength(3);
  });
});

describe('trend', () => {
  it('compares against the previous period', () => {
    expect(trend(1500, 1000)).toEqual({ deltaPct: 50, direction: 'up' });
    expect(trend(500, 1000)).toEqual({ deltaPct: -50, direction: 'down' });
    expect(trend(1000, 1000)).toEqual({ deltaPct: 0, direction: 'flat' });
  });

  it('calls a tiny change flat', () => {
    expect(trend(10_003, 10_000)?.direction).toBe('flat');
  });

  it('has nothing to compare with when the previous period was empty', () => {
    expect(trend(500, 0)).toBeNull();
  });
});
