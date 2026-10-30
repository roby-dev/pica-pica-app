import { err, ok, type Result } from '@pp/shared/kernel';
import { ensurePickable, type Category, type PaymentMethod } from '../../domain/category';
import { ArchivedCatalogItemError, ExpenseValidationError } from '../../domain/expense.errors';

export interface CatalogSnapshot {
  readonly categories: readonly Category[];
  readonly methods: readonly PaymentMethod[];
}

/**
 * Rule 6: a category or method must exist and, when newly chosen, must not be archived.
 * Pass the ids already on the expense as `keep` so editing an old expense that uses an
 * archived item still works.
 */
export function checkCatalogChoice(
  catalog: CatalogSnapshot,
  categoryId: string,
  methodId: string,
  keep: { categoryId?: string; methodId?: string } = {},
): Result<void, ExpenseValidationError | ArchivedCatalogItemError> {
  const category = catalog.categories.find((c) => c.id === categoryId);
  if (!category) return err(new ExpenseValidationError('category', 'Pick a category'));
  const method = catalog.methods.find((m) => m.id === methodId);
  if (!method) return err(new ExpenseValidationError('paymentMethod', 'Pick how you paid'));

  if (categoryId !== keep.categoryId) {
    const pickable = ensurePickable(category);
    if (!pickable.ok) return pickable;
  }
  if (methodId !== keep.methodId) {
    const pickable = ensurePickable(method);
    if (!pickable.ok) return pickable;
  }
  return ok(undefined);
}
