import { err, ok, toIsoWithOffset, type Brand, type Result } from '@pp/shared/kernel';
import { ExpenseValidationError } from './expense.errors';

/** ISO-8601 local date-time with offset, e.g. `2026-10-30T08:15:00-05:00`. */
export type OccurredAt = Brand<string, 'OccurredAt'>;

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** An expense may be logged up to one day ahead (time zones, late-night entries) but not further. */
export function parseOccurredAt(text: string, now: Date): Result<OccurredAt, ExpenseValidationError> {
  const value = text.trim();
  const time = Date.parse(value);
  if (!ISO_WITH_OFFSET.test(value) || Number.isNaN(time)) {
    return err(new ExpenseValidationError('occurredAt', 'Enter a valid date and time'));
  }
  if (time > now.getTime() + ONE_DAY_MS) {
    return err(new ExpenseValidationError('occurredAt', 'The date cannot be more than a day ahead'));
  }
  return ok(value as OccurredAt);
}

/** Formats a Date as local time with its UTC offset, so the day an expense happened never shifts. */
export const toOccurredAt = (date: Date): OccurredAt => toIsoWithOffset(date) as OccurredAt;

/** `YYYY-MM-DD` in the expense's own local time. */
export const localDayKey = (at: OccurredAt): string => at.slice(0, 10);

/** `YYYY-MM` in the expense's own local time. */
export const monthKey = (at: OccurredAt): string => at.slice(0, 7);

/** ISO week key `YYYY-Www`; ISO weeks start on Monday. */
export function isoWeekKey(at: OccurredAt): string {
  const [year, month, day] = localDayKey(at).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayIndex = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dayIndex + 3); // Thursday of this week decides the ISO year
  const weekYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * ONE_DAY_MS));
  return `${weekYear}-W${String(week).padStart(2, '0')}`;
}
