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
  /** Display order, ascending. */
  readonly position: number;
  /**
   * Whether small expenses here count as ant spending. Absent on categories saved before this existed;
   * `countsAsAnt` fills the gap so stored data never needs migrating.
   */
  readonly antSpending?: boolean;
}

/** Categories that were never "ant" habits: fixed or planned spending. */
const NOT_ANT_BY_DEFAULT: ReadonlySet<string> = new Set(['cat-transporte', 'cat-bodega', 'cat-mercado', 'cat-otros']);

export const countsAsAnt = (category: Pick<Category, 'id' | 'antSpending'>): boolean =>
  category.antSpending ?? !NOT_ANT_BY_DEFAULT.has(category.id);

export type PaymentMethodKind = 'cash' | 'debit' | 'credit' | 'transfer' | 'wallet' | 'other';

export interface PaymentMethod {
  readonly id: PaymentMethodId;
  readonly name: string;
  readonly kind: PaymentMethodKind;
  readonly archived: boolean;
  readonly position: number;
}

/** Rule 6: archived items cannot be picked for new expenses. */
export function ensurePickable(item: { readonly name: string; readonly archived: boolean }): Result<void, ArchivedCatalogItemError> {
  return item.archived ? err(new ArchivedCatalogItemError(item.name)) : ok(undefined);
}
