import type { CurrencyCode, DomainError, Result } from '@pp/shared/kernel';
import { createExpense, type Expense } from '../../domain/expense';
import { checkCatalogChoice, type CatalogSnapshot } from './catalog-check';

/** What the quick-add form submits. Currency is optional: it falls back to the user's default. */
export interface ExpenseCommand {
  readonly what: string;
  readonly amountMinor: number;
  readonly currency?: CurrencyCode;
  readonly categoryId: string;
  readonly paymentMethodId: string;
  readonly place?: string | null;
  readonly occurredAt: string;
  readonly note?: string | null;
}

export interface AddExpenseContext {
  readonly id: string;
  readonly now: Date;
  readonly defaultCurrency: CurrencyCode;
  readonly catalog: CatalogSnapshot;
}

/** Validates and builds the new expense. Persisting is the store's job so it can update the UI first. */
export function addExpense(command: ExpenseCommand, context: AddExpenseContext): Result<Expense, DomainError> {
  const choice = checkCatalogChoice(context.catalog, command.categoryId, command.paymentMethodId);
  if (!choice.ok) return choice;

  return createExpense(
    {
      what: command.what,
      amount: { amountMinor: command.amountMinor, currency: command.currency ?? context.defaultCurrency },
      categoryId: command.categoryId,
      paymentMethodId: command.paymentMethodId,
      place: command.place,
      occurredAt: command.occurredAt,
      note: command.note,
    },
    { id: context.id, now: context.now },
  );
}
