import type { Expense } from './expense';
import type { ExpensePreset } from './expense-draft';
import { localDayKey, type OccurredAt } from './occurred-at';

/** The expense fields a preset is learned from. */
export type PresetSource = Pick<Expense, 'what' | 'amount' | 'categoryId' | 'paymentMethodId' | 'place' | 'occurredAt'>;

const DEFAULT_LIMIT = 8;
/** An occurrence counts half as much every two weeks: habits fade, they do not vanish. */
const HALF_LIFE_DAYS = 14;
/** Hours apart within which an occurrence still gets an hour-of-day boost. */
const HOUR_WINDOW = 3;
const MAX_HOUR_BOOST = 2;
const SAME_DAY_TYPE_BOOST = 1.5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ranks expense names by how likely they are right now: every past occurrence adds a score that
 * fades with age and grows when it happened at a similar hour and on the same kind of day
 * (weekday vs weekend). Names are grouped ignoring case and surrounding spaces; each preset
 * autofills from, and is labeled as, the latest occurrence of its name.
 */
export function rankPresets(
  expenses: readonly PresetSource[],
  now: OccurredAt,
  limit = DEFAULT_LIMIT,
): readonly ExpensePreset[] {
  const nowTime = Date.parse(now);
  const nowHour = hourOf(now);
  const nowWeekend = isWeekend(now);
  const byName = new Map<string, { score: number; latest: PresetSource }>();

  for (const expense of expenses) {
    const key = habitKey(expense.what);
    if (!key) continue;
    const ageDays = Math.max(0, (nowTime - Date.parse(expense.occurredAt)) / MS_PER_DAY);
    const hourGap = circularHourGap(hourOf(expense.occurredAt), nowHour);
    const score =
      0.5 ** (ageDays / HALF_LIFE_DAYS) *
      (1 + MAX_HOUR_BOOST * Math.max(0, 1 - hourGap / HOUR_WINDOW)) *
      (isWeekend(expense.occurredAt) === nowWeekend ? SAME_DAY_TYPE_BOOST : 1);

    const entry = byName.get(key);
    if (!entry) {
      byName.set(key, { score, latest: expense });
      continue;
    }
    entry.score += score;
    if (Date.parse(expense.occurredAt) > Date.parse(entry.latest.occurredAt)) entry.latest = expense;
  }

  return [...byName.values()]
    .sort((a, b) => b.score - a.score || Date.parse(b.latest.occurredAt) - Date.parse(a.latest.occurredAt))
    .slice(0, limit)
    .map(({ latest }) => ({
      what: latest.what.trim(),
      amountMinor: latest.amount.amountMinor,
      currency: latest.amount.currency,
      categoryId: latest.categoryId,
      paymentMethodId: latest.paymentMethodId,
      place: latest.place,
    }));
}

/**
 * "Café", "café" and " CAFÉ " are one habit, matching how insights counts habits; accents still
 * matter there, so they do here too.
 */
const habitKey = (what: string): string => what.trim().toLowerCase();

/** Local hour with minutes as a fraction, read from the expense's own offset. */
function hourOf(at: OccurredAt): number {
  return Number(at.slice(11, 13)) + Number(at.slice(14, 16)) / 60;
}

/** 23:00 and 01:00 are two hours apart, not twenty-two. */
function circularHourGap(a: number, b: number): number {
  const gap = Math.abs(a - b);
  return Math.min(gap, 24 - gap);
}

function isWeekend(at: OccurredAt): boolean {
  const [year, month, day] = localDayKey(at).split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}
