import type { CurrencyCode, Money } from '@pp/shared/kernel';
import {
  containsDay,
  daysInRange,
  elapsedDays,
  listDays,
  listMonths,
  type DateRange,
  type PeriodKind,
} from './period';

/**
 * What analytics needs to know about one expense. The insights feature owns this shape so it never
 * depends on how the expenses feature models its own domain. `day` is the local calendar day.
 */
export interface SpendRecord {
  readonly id: string;
  readonly what: string;
  readonly amount: Money;
  readonly categoryId: string;
  readonly paymentMethodId: string;
  readonly place: string | null;
  readonly day: string;
  /** False when the category is one the user does not treat as ant spending (Transporte, Mercado...). Defaults to true. */
  readonly countsAsAnt?: boolean;
}

/*
 * Every function takes the currency it works in. Currencies are never added together; there is no
 * conversion, so a total only means something inside one currency.
 */

export function recordsIn(records: readonly SpendRecord[], range: DateRange, currency: CurrencyCode): readonly SpendRecord[] {
  return records.filter((r) => r.amount.currency === currency && containsDay(range, r.day));
}

/** Currencies with spending in the range, biggest number of expenses first. */
export function currenciesIn(records: readonly SpendRecord[], range: DateRange): readonly CurrencyCode[] {
  const counts = new Map<CurrencyCode, number>();
  for (const r of records) {
    if (containsDay(range, r.day)) counts.set(r.amount.currency, (counts.get(r.amount.currency) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code);
}

export const sumMinor = (records: readonly SpendRecord[]): number => records.reduce((sum, r) => sum + r.amount.amountMinor, 0);

/** Average per elapsed day, so a month in progress is not diluted by days that have not happened. */
export function dailyAverageMinor(totalMinor: number, range: DateRange, today: string): number {
  const days = elapsedDays(range, today);
  return days === 0 ? 0 : Math.round(totalMinor / days);
}

/** Where the period is heading at the current pace. Null when it is over or has not started. */
export function projectedTotalMinor(totalMinor: number, range: DateRange, today: string): number | null {
  const elapsed = elapsedDays(range, today);
  const length = daysInRange(range);
  if (elapsed === 0 || elapsed >= length) return null;
  return Math.round((totalMinor / elapsed) * length);
}

export interface SeriesPoint {
  readonly key: string;
  readonly totalMinor: number;
  readonly count: number;
}

/** One point per day (week, month) or per month (year), zeros included so charts keep their shape. */
export function bucketSeries(
  records: readonly SpendRecord[],
  kind: PeriodKind,
  range: DateRange,
  currency: CurrencyCode,
): readonly SeriesPoint[] {
  const keyOf = (day: string) => (kind === 'year' ? day.slice(0, 7) : day);
  const keys = kind === 'year' ? listMonths(range) : listDays(range);
  const buckets = new Map<string, { totalMinor: number; count: number }>(keys.map((k) => [k, { totalMinor: 0, count: 0 }]));
  for (const r of recordsIn(records, range, currency)) {
    const bucket = buckets.get(keyOf(r.day));
    if (bucket) {
      bucket.totalMinor += r.amount.amountMinor;
      bucket.count += 1;
    }
  }
  return keys.map((key) => ({ key, ...buckets.get(key)! }));
}

export interface RankedItem {
  readonly key: string;
  readonly label: string;
  readonly totalMinor: number;
  readonly count: number;
  /** Fraction of the grouped total, 0 to 1. */
  readonly share: number;
}

interface Group {
  readonly key: string;
  readonly label: string;
}

/** Groups by whatever `pick` returns (null skips the record) and ranks by total spent. */
export function rankBy(
  records: readonly SpendRecord[],
  pick: (record: SpendRecord) => Group | null,
): readonly RankedItem[] {
  const groups = new Map<string, { label: string; totalMinor: number; count: number }>();
  for (const record of records) {
    const group = pick(record);
    if (!group) continue;
    const entry = groups.get(group.key) ?? { label: group.label, totalMinor: 0, count: 0 };
    entry.totalMinor += record.amount.amountMinor;
    entry.count += 1;
    groups.set(group.key, entry);
  }
  const total = [...groups.values()].reduce((sum, g) => sum + g.totalMinor, 0);
  return [...groups]
    .map(([key, g]) => ({ key, label: g.label, totalMinor: g.totalMinor, count: g.count, share: total === 0 ? 0 : g.totalMinor / total }))
    .sort((a, b) => b.totalMinor - a.totalMinor || b.count - a.count || a.key.localeCompare(b.key));
}

export const byCategory = (records: readonly SpendRecord[]) =>
  rankBy(records, (r) => ({ key: r.categoryId, label: r.categoryId }));

export const byMethod = (records: readonly SpendRecord[]) =>
  rankBy(records, (r) => ({ key: r.paymentMethodId, label: r.paymentMethodId }));

/** Places are grouped ignoring case and spacing; expenses without a place are left out. */
export const byPlace = (records: readonly SpendRecord[]) =>
  rankBy(records, (r) => (r.place ? { key: r.place.trim().toLowerCase(), label: r.place.trim() } : null));

/** Rule 5: an ant expense is at or under the threshold, and only inside the threshold's currency. */
export const isAntExpense = (amount: Money, threshold: Money): boolean =>
  amount.currency === threshold.currency && amount.amountMinor <= threshold.amountMinor;

/** Rule 5b: a record is an ant expense when it is small enough and its category counts as ant spending. */
const isAntRecord = (record: SpendRecord, threshold: Money): boolean =>
  record.countsAsAnt !== false && isAntExpense(record.amount, threshold);

export interface AntSplit {
  /** False when the currency differs from the threshold's: ant status cannot be judged without a conversion. */
  readonly classified: boolean;
  readonly antTotalMinor: number;
  readonly antCount: number;
  /** Fraction of the total spent on ant expenses, 0 to 1. Null when not classified or nothing was spent. */
  readonly antShare: number | null;
}

export function antSplit(records: readonly SpendRecord[], currency: CurrencyCode, threshold: Money): AntSplit {
  if (currency !== threshold.currency) return { classified: false, antTotalMinor: 0, antCount: 0, antShare: null };
  const ant = records.filter((r) => r.amount.currency === currency && isAntRecord(r, threshold));
  const antTotalMinor = sumMinor(ant);
  const totalMinor = sumMinor(records.filter((r) => r.amount.currency === currency));
  return { classified: true, antTotalMinor, antCount: ant.length, antShare: totalMinor === 0 ? null : antTotalMinor / totalMinor };
}

export interface TopAntItem {
  readonly key: string;
  readonly what: string;
  readonly place: string | null;
  readonly count: number;
  readonly totalMinor: number;
}

/**
 * The small habits that add up: the same thing bought in the same place. Ranked by how often it
 * repeats first (that is what makes it a habit), then by what it cost in total.
 */
export function topAnt(records: readonly SpendRecord[], currency: CurrencyCode, threshold: Money, limit = 5): readonly TopAntItem[] {
  if (currency !== threshold.currency) return [];
  const groups = new Map<string, { what: string; place: string | null; count: number; totalMinor: number }>();
  for (const r of records) {
    if (r.amount.currency !== currency || !isAntRecord(r, threshold)) continue;
    const key = `${r.what.trim().toLowerCase()}|${r.place?.trim().toLowerCase() ?? ''}`;
    const entry = groups.get(key) ?? { what: r.what.trim(), place: r.place?.trim() ?? null, count: 0, totalMinor: 0 };
    entry.count += 1;
    entry.totalMinor += r.amount.amountMinor;
    groups.set(key, entry);
  }
  return [...groups]
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => b.count - a.count || b.totalMinor - a.totalMinor || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export interface Trend {
  readonly deltaPct: number;
  /** `up` means spending went up. */
  readonly direction: 'up' | 'down' | 'flat';
}

/** Change against the previous period. Null when there is nothing to compare with. */
export function trend(currentMinor: number, previousMinor: number): Trend | null {
  if (previousMinor <= 0) return null;
  const deltaPct = ((currentMinor - previousMinor) / previousMinor) * 100;
  const rounded = Math.round(deltaPct);
  return { deltaPct, direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat' };
}

/** Expenses in currencies other than the threshold's: the hint behind "no se puede clasificar". */
export function unclassifiedCount(records: readonly SpendRecord[], threshold: Money): number {
  return records.filter((r) => r.amount.currency !== threshold.currency).length;
}
