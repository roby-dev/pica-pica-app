import { err, ok, type Money, type Result } from '@pp/shared/kernel';
import { ExpenseValidationError } from './expense.errors';
import { categoryId, expenseId, paymentMethodId, type CategoryId, type ExpenseId, type PaymentMethodId } from './ids';
import { parseOccurredAt, type OccurredAt } from './occurred-at';
import { parseNote, parsePlaceName, type Note, type PlaceName } from './place-name';

export const MAX_WHAT_LENGTH = 60;
export const MAX_AMOUNT_MINOR = 1e12;

export interface Expense {
  readonly id: ExpenseId;
  /** "que cosas": what was bought. */
  readonly what: string;
  /** "cuanto": carries its own currency. */
  readonly amount: Money;
  readonly categoryId: CategoryId;
  /** "como". */
  readonly paymentMethodId: PaymentMethodId;
  /** "donde". */
  readonly place: PlaceName | null;
  /** "cuando". */
  readonly occurredAt: OccurredAt;
  readonly note: Note | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Soft delete: kept as a tombstone so a future sync can propagate it. */
  readonly deletedAt: string | null;
}

/** Raw values as a form collects them. Validation happens in `createExpense`. */
export interface ExpenseInput {
  readonly what: string;
  readonly amount: Money;
  readonly categoryId: string;
  readonly paymentMethodId: string;
  readonly place?: string | null;
  readonly occurredAt: string;
  readonly note?: string | null;
}

export interface ExpenseContext {
  readonly id: string;
  readonly now: Date;
}

/** Rule 1 and 2: every expense is complete and keeps its own currency. */
export function createExpense(input: ExpenseInput, context: ExpenseContext): Result<Expense, ExpenseValidationError> {
  const fields = validateFields(input, context.now);
  if (!fields.ok) return fields;

  const timestamp = context.now.toISOString();
  return ok({
    id: expenseId(context.id),
    ...fields.value,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
}

/** Re-validates the whole expense with new values; identity and creation time are preserved. */
export function updateExpense(
  existing: Expense,
  input: ExpenseInput,
  now: Date,
): Result<Expense, ExpenseValidationError> {
  const fields = validateFields(input, now);
  if (!fields.ok) return fields;
  return ok({ ...existing, ...fields.value, updatedAt: now.toISOString() });
}

/** Rule 7: delete is soft, so lists and totals skip it and the user can undo. */
export const softDeleteExpense = (expense: Expense, now: Date): Expense => ({
  ...expense,
  deletedAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

export const restoreExpense = (expense: Expense, now: Date): Expense => ({
  ...expense,
  deletedAt: null,
  updatedAt: now.toISOString(),
});

export const isActive = (expense: Expense): boolean => expense.deletedAt === null;

type Fields = Pick<
  Expense,
  'what' | 'amount' | 'categoryId' | 'paymentMethodId' | 'place' | 'occurredAt' | 'note'
>;

function validateFields(input: ExpenseInput, now: Date): Result<Fields, ExpenseValidationError> {
  const what = input.what.trim();
  if (what === '' || what.length > MAX_WHAT_LENGTH) {
    return err(new ExpenseValidationError('what', `Describe it in 1 to ${MAX_WHAT_LENGTH} characters`));
  }

  const { amountMinor } = input.amount;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_AMOUNT_MINOR) {
    return err(new ExpenseValidationError('amount', 'Enter an amount greater than zero'));
  }

  if (input.categoryId.trim() === '') {
    return err(new ExpenseValidationError('category', 'Pick a category'));
  }
  if (input.paymentMethodId.trim() === '') {
    return err(new ExpenseValidationError('paymentMethod', 'Pick how you paid'));
  }

  const place = parsePlaceName(input.place);
  if (!place.ok) return place;
  const note = parseNote(input.note);
  if (!note.ok) return note;
  const occurredAt = parseOccurredAt(input.occurredAt, now);
  if (!occurredAt.ok) return occurredAt;

  return ok({
    what,
    amount: input.amount,
    categoryId: categoryId(input.categoryId),
    paymentMethodId: paymentMethodId(input.paymentMethodId),
    place: place.value,
    occurredAt: occurredAt.value,
    note: note.value,
  });
}
