import type { CurrencyCode } from '@pp/shared/kernel';
import type { CategoryId, PaymentMethodId } from './ids';
import type { PlaceName } from './place-name';

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

/** Most recent values for a recurring expense name, used to autofill the quick-add form in one tap. */
export interface ExpensePreset {
  readonly what: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly categoryId: CategoryId;
  readonly paymentMethodId: PaymentMethodId;
  readonly place: PlaceName | null;
}
