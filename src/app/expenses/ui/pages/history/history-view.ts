import { addTo, emptyTotals, toMoneyList, type Money } from '@pp/shared/kernel';
import type { Category, PaymentMethod } from '../../../domain/category';
import type { Expense } from '../../../domain/expense';
import { localDayKey, toOccurredAt } from '../../../domain/occurred-at';
import type { DayGroupVm } from '../../components/day-group/day-group';
import type { ExpenseRowVm } from '../../components/expense-row/expense-row';

export interface HistoryFilter {
  readonly query: string;
  readonly categoryId: string | null;
}

export interface HistoryViewContext {
  readonly now: Date;
  readonly locale: string;
  readonly threshold: Money;
  readonly categories: ReadonlyMap<string, Category>;
  readonly methods: ReadonlyMap<string, PaymentMethod>;
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Search is accent- and case-insensitive over what, place and note. */
export function filterHistory(expenses: readonly Expense[], filter: HistoryFilter): readonly Expense[] {
  const needle = fold(filter.query.trim());
  return expenses.filter((expense) => {
    if (filter.categoryId && expense.categoryId !== filter.categoryId) return false;
    if (!needle) return true;
    return fold([expense.what, expense.place, expense.note].filter(Boolean).join(' ')).includes(needle);
  });
}

/** Groups newest-first expenses by local day. Day totals are kept per currency, never mixed. */
export function toDayGroups(expenses: readonly Expense[], context: HistoryViewContext): readonly DayGroupVm[] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const key = localDayKey(expense.occurredAt);
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  }
  return [...groups].map(([dayKey, items]) => ({
    dayKey,
    dayLabel: dayLabel(dayKey, context),
    totals: toMoneyList(items.reduce((totals, e) => addTo(totals, e.amount), emptyTotals())),
    rows: items.map((expense) => toRow(expense, context)),
  }));
}

function toRow(expense: Expense, context: HistoryViewContext): ExpenseRowVm {
  const category = context.categories.get(expense.categoryId);
  return {
    id: expense.id,
    what: expense.what,
    money: expense.amount,
    categoryName: category?.name ?? 'Sin categoría',
    categoryColor: category?.color ?? 'oklch(0.75 0.03 285)',
    place: expense.place,
    methodName: context.methods.get(expense.paymentMethodId)?.name ?? '',
    timeLabel: new Intl.DateTimeFormat(context.locale, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(expense.occurredAt),
    ),
    // Only comparable inside one currency; a USD expense is never an ant expense by a PEN threshold.
    isAnt:
      expense.amount.currency === context.threshold.currency &&
      expense.amount.amountMinor <= context.threshold.amountMinor,
  };
}

function dayLabel(dayKey: string, { now, locale }: HistoryViewContext): string {
  const today = localDayKey(toOccurredAt(now));
  const yesterday = localDayKey(toOccurredAt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12)));
  if (dayKey === today) return 'Hoy';
  if (dayKey === yesterday) return 'Ayer';
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day),
  );
}
