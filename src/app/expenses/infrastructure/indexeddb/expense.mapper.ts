import { Money, parseCurrency } from '@pp/shared/kernel';
import type { ExpenseRecord } from '@pp/shared/persistence';
import type { Expense } from '../../domain/expense';
import { categoryId, expenseId, paymentMethodId } from '../../domain/ids';
import { localDayKey, type OccurredAt } from '../../domain/occurred-at';
import { placeKey, type Note, type PlaceName } from '../../domain/place-name';

export function toRecord(expense: Expense): ExpenseRecord {
  return {
    id: expense.id,
    what: expense.what,
    amountMinor: expense.amount.amountMinor,
    currency: expense.amount.currency,
    categoryId: expense.categoryId,
    paymentMethodId: expense.paymentMethodId,
    place: expense.place,
    placeKey: expense.place ? placeKey(expense.place) : null,
    occurredAt: expense.occurredAt,
    occurredDay: localDayKey(expense.occurredAt),
    note: expense.note,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    deletedAt: expense.deletedAt,
  };
}

/**
 * Rebuilds a domain expense from storage. Records that cannot be read safely (unknown currency,
 * non-integer amount) return null so one bad row never breaks the whole list.
 */
export function toExpense(record: ExpenseRecord): Expense | null {
  const currency = parseCurrency(record.currency);
  if (!currency.ok || !Number.isSafeInteger(record.amountMinor)) return null;

  return {
    id: expenseId(record.id),
    what: record.what,
    amount: Money.fromMinor(record.amountMinor, currency.value),
    categoryId: categoryId(record.categoryId),
    paymentMethodId: paymentMethodId(record.paymentMethodId),
    place: record.place as PlaceName | null,
    occurredAt: record.occurredAt as OccurredAt,
    note: record.note as Note | null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
