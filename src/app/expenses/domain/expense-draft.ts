import type { CurrencyCode } from '@pp/shared/kernel';
import type { CategoryId, PaymentMethodId } from './ids';

/** What the user has typed into the quick-add form but not saved yet. */
export interface ExpenseDraft {
  readonly amountMinor: number | null;
  readonly what: string;
  readonly categoryId: CategoryId | null;
  readonly paymentMethodId: PaymentMethodId | null;
  readonly place: string;
  readonly note: string;
  /** Only set when the user picked a date; null means "use the moment the form opens". */
  readonly occurredAt: string | null;
  readonly currency: CurrencyCode | null;
}
