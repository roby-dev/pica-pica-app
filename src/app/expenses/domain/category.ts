import { err, ok, type Result } from '@pp/shared/kernel';
import type { CategoryId, PaymentMethodId } from './ids';
import { ArchivedCatalogItemError } from './expense.errors';

export interface Category {
  readonly id: CategoryId;
  readonly name: string;
  readonly emoji: string;
  /** Any CSS color; pastel tones that sit well on glass. */
  readonly color: string;
  readonly archived: boolean;
}

export type PaymentMethodKind = 'cash' | 'debit' | 'credit' | 'transfer' | 'wallet' | 'other';

export interface PaymentMethod {
  readonly id: PaymentMethodId;
  readonly name: string;
  readonly kind: PaymentMethodKind;
  readonly archived: boolean;
}

/** Rule 6: archived items cannot be picked for new expenses. */
export function ensurePickable(item: { readonly name: string; readonly archived: boolean }): Result<void, ArchivedCatalogItemError> {
  return item.archived ? err(new ArchivedCatalogItemError(item.name)) : ok(undefined);
}
