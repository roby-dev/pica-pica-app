import { err, ok, type Result } from '@pp/shared/kernel';
import { ExpenseValidationError, type ExpenseField } from '../../domain/expense.errors';

export const MAX_CATALOG_NAME_LENGTH = 24;

/** A catalog name is short (it must fit a badge) and unique among its siblings, ignoring case. */
export function validCatalogName<T extends { readonly id: string; readonly name: string }>(
  field: ExpenseField,
  raw: string,
  id: string,
  siblings: readonly T[],
): Result<string, ExpenseValidationError> {
  const name = raw.trim();
  if (name === '' || name.length > MAX_CATALOG_NAME_LENGTH) {
    return err(new ExpenseValidationError(field, `Use 1 to ${MAX_CATALOG_NAME_LENGTH} characters`));
  }
  const taken = siblings.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase());
  return taken ? err(new ExpenseValidationError(field, 'That name is already in use')) : ok(name);
}
