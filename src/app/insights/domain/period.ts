/** Calendar math on local day keys (`YYYY-MM-DD`). Weeks run Monday to Sunday. */
export type PeriodKind = 'week' | 'month' | 'year';

/** Inclusive on both ends. */
export interface DateRange {
  readonly fromDay: string;
  readonly toDay: string;
}

const MS_PER_DAY = 86_400_000;

// UTC arithmetic keeps day math free of time zones and daylight-saving jumps.
const parse = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
};
const format = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (day: string, days: number): string => format(new Date(parse(day).getTime() + days * MS_PER_DAY));

export function rangeFor(kind: PeriodKind, anchorDay: string): DateRange {
  const anchor = parse(anchorDay);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  switch (kind) {
    case 'week': {
      const sinceMonday = (anchor.getUTCDay() + 6) % 7;
      const fromDay = addDays(anchorDay, -sinceMonday);
      return { fromDay, toDay: addDays(fromDay, 6) };
    }
    case 'month':
      return { fromDay: format(new Date(Date.UTC(year, month, 1))), toDay: format(new Date(Date.UTC(year, month + 1, 0))) };
    case 'year':
      return { fromDay: `${year}-01-01`, toDay: `${year}-12-31` };
  }
}

/** Moves the anchor by whole periods. Months and years land on their first day so day overflow never happens. */
export function shiftAnchor(kind: PeriodKind, anchorDay: string, steps: number): string {
  const anchor = parse(anchorDay);
  switch (kind) {
    case 'week':
      return addDays(anchorDay, 7 * steps);
    case 'month':
      return format(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + steps, 1)));
    case 'year':
      return format(new Date(Date.UTC(anchor.getUTCFullYear() + steps, 0, 1)));
  }
}

export const previousRange = (kind: PeriodKind, anchorDay: string): DateRange =>
  rangeFor(kind, shiftAnchor(kind, anchorDay, -1));

/** The future has no spending to show, so navigation stops at the period that contains `today`. */
export const canGoNext = (kind: PeriodKind, anchorDay: string, today: string): boolean =>
  rangeFor(kind, shiftAnchor(kind, anchorDay, 1)).fromDay <= today;

export const containsDay = (range: DateRange, day: string): boolean => day >= range.fromDay && day <= range.toDay;

export const daysInRange = (range: DateRange): number =>
  Math.round((parse(range.toDay).getTime() - parse(range.fromDay).getTime()) / MS_PER_DAY) + 1;

/** Days of the range that have already happened, today included. Zero for a range that has not started. */
export function elapsedDays(range: DateRange, today: string): number {
  if (today < range.fromDay) return 0;
  return daysInRange({ fromDay: range.fromDay, toDay: today < range.toDay ? today : range.toDay });
}

export const listDays = (range: DateRange): readonly string[] =>
  Array.from({ length: daysInRange(range) }, (_, i) => addDays(range.fromDay, i));

/** Every `YYYY-MM` the range touches, in order. */
export function listMonths(range: DateRange): readonly string[] {
  const months: string[] = [];
  for (const day of listDays(range)) {
    const key = day.slice(0, 7);
    if (months.at(-1) !== key) months.push(key);
  }
  return months;
}
