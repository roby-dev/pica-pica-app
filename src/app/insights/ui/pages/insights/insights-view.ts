import type { SeriesPoint } from '../../../domain/expense-analytics';
import type { DateRange, PeriodKind } from '../../../domain/period';
import type { BarPoint } from '../../components/bar-chart/bar-chart';

const fromDayKey = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

/** "26 oct – 1 nov", "octubre 2026" or "2026". Capitalization is left to CSS. */
export function periodLabel(kind: PeriodKind, range: DateRange, locale: string): string {
  const from = fromDayKey(range.fromDay);
  switch (kind) {
    case 'week': {
      const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
      return `${short.format(from)} – ${short.format(fromDayKey(range.toDay))}`;
    }
    case 'month':
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(from);
    case 'year':
      return String(from.getFullYear());
  }
}

/** Reads "vs semana anterior" next to the trend badge. */
export const previousPeriodName = (kind: PeriodKind): string =>
  ({ week: 'semana anterior', month: 'mes anterior', year: 'año anterior' })[kind];

/** Chart points with a readable name for the readout and a short tick that keeps the axis uncluttered. */
export function barPoints(series: readonly SeriesPoint[], kind: PeriodKind, locale: string): readonly BarPoint[] {
  const longDay = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' });
  const narrowWeekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const longMonth = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const narrowMonth = new Intl.DateTimeFormat(locale, { month: 'narrow' });

  return series.map((point) => {
    if (kind === 'year') {
      const date = fromDayKey(`${point.key}-01`);
      return { key: point.key, label: longMonth.format(date), tick: narrowMonth.format(date), value: point.totalMinor };
    }
    const date = fromDayKey(point.key);
    const day = date.getDate();
    const tick = kind === 'week' ? narrowWeekday.format(date) : day === 1 || day % 5 === 0 ? String(day) : undefined;
    return { key: point.key, label: longDay.format(date), tick, value: point.totalMinor };
  });
}
