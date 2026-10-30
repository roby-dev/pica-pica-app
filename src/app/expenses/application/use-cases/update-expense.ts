import type { CurrencyCode, DomainError, Result } from '@pp/shared/kernel';
import { updateExpense as applyUpdate, type Expense } from '../../domain/expense';
import { checkCatalogChoice, type CatalogSnapshot } from './catalog-check';
import type { ExpenseCommand } from './add-expense';

export interface UpdateExpenseContext {
  readonly now: Date;
  readonly defaultCurrency: CurrencyCode;
  readonly catalog: CatalogSnapshot;
}

/** Re-validates an edited expense. Keeping an archived category or method it already had is allowed. */
export function editExpense(
  existing: Expense,
  command: ExpenseCommand,
  context: UpdateExpenseContext,
): Result<Expense, DomainError> {
  const choice = checkCatalogChoice(context.catalog, command.categoryId, command.paymentMethodId, {
    categoryId: existing.categoryId,
    methodId: existing.paymentMethodId,
  });
  if (!choice.ok) return choice;

  return applyUpdate(
    existing,
    {
      what: command.what,
      amount: {
        amountMinor: command.amountMinor,
        currency: command.currency ?? existing.amount.currency,
      },
      categoryId: command.categoryId,
      paymentMethodId: command.paymentMethodId,
      place: command.place,
      occurredAt: command.occurredAt,
      note: command.note,
    },
    context.now,
  );
}
