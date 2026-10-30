import { bucketSeries } from '../../../domain/expense-analytics';
import { rangeFor } from '../../../domain/period';
import { barPoints, periodLabel, previousPeriodName } from './insights-view';

describe('periodLabel', () => {
  it('names weeks by their first and last day', () => {
    expect(periodLabel('week', rangeFor('week', '2026-10-30'), 'es-PE')).toMatch(/^26 oct\.? – 1 nov\.?$/);
  });

  it('names months and years', () => {
    expect(periodLabel('month', rangeFor('month', '2026-10-15'), 'es-PE')).toBe('octubre de 2026');
    expect(periodLabel('year', rangeFor('year', '2026-10-15'), 'es-PE')).toBe('2026');
  });
});

describe('previousPeriodName', () => {
  it('matches the period being compared', () => {
    expect(previousPeriodName('week')).toBe('semana anterior');
    expect(previousPeriodName('month')).toBe('mes anterior');
    expect(previousPeriodName('year')).toBe('año anterior');
  });
});

describe('barPoints', () => {
  const PEN = 'PEN' as never;

  it('gives a week one narrow weekday tick per bar and a full readable name', () => {
    const points = barPoints(bucketSeries([], 'week', rangeFor('week', '2026-10-30'), PEN), 'week', 'es-PE');
    expect(points).toHaveLength(7);
    expect(points.map((p) => p.tick)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
    expect(points[0].label).toMatch(/lunes/);
    expect(points[0].label).toMatch(/26/);
  });

  it('ticks a month on the 1st and every fifth day only', () => {
    const points = barPoints(bucketSeries([], 'month', rangeFor('month', '2026-10-15'), PEN), 'month', 'es-PE');
    expect(points.filter((p) => p.tick).map((p) => p.tick)).toEqual(['1', '5', '10', '15', '20', '25', '30']);
  });

  it('labels the twelve months of a year and carries the amounts through', () => {
    const series = bucketSeries(
      [{ id: '1', what: 'x', amount: { amountMinor: 700, currency: PEN }, categoryId: 'c', paymentMethodId: 'm', place: null, day: '2026-03-04' }],
      'year',
      rangeFor('year', '2026-01-01'),
      PEN,
    );
    const points = barPoints(series, 'year', 'es-PE');
    expect(points).toHaveLength(12);
    expect(points[2].value).toBe(700);
    expect(points[2].label).toMatch(/marzo/);
  });
});
