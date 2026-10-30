import type { Category, PaymentMethod } from '../../domain/category';

/** Archiving hides an item from pickers but keeps it valid on old expenses (deleting is not offered). */
export const withCategoryArchived = (category: Category, archived: boolean): Category => ({
  ...category,
  archived,
});

export const withMethodArchived = (method: PaymentMethod, archived: boolean): PaymentMethod => ({
  ...method,
  archived,
});
