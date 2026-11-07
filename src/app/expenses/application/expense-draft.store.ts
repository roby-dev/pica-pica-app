import { Injectable, signal } from '@angular/core';
import type { ExpenseDraft } from '../domain/expense-draft';
import { paymentMethodId, type PaymentMethodId } from '../domain/ids';

const LAST_METHOD_KEY = 'pp-last-method';

/** A method on its own is a preference, not an entry worth keeping: the form pre-selects it anyway. */
const isBlank = (draft: ExpenseDraft): boolean =>
  draft.amountMinor === null &&
  draft.what === '' &&
  draft.categoryId === null &&
  draft.place === '' &&
  draft.note === '' &&
  draft.occurredAt === null &&
  draft.currency === null;

function readLastMethod(): PaymentMethodId | null {
  try {
    const stored = localStorage.getItem(LAST_METHOD_KEY);
    return stored ? paymentMethodId(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps an unsaved quick-add entry alive while the user navigates elsewhere (in memory: a reload starts clean),
 * and remembers the payment method used last, which does survive reloads. A blank draft is never stored,
 * so saving or resetting the form clears it for free.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseDraftStore {
  private readonly state = signal<ExpenseDraft | null>(null);
  private readonly last = signal<PaymentMethodId | null>(readLastMethod());

  readonly current = this.state.asReadonly();
  readonly lastMethodId = this.last.asReadonly();

  save(draft: ExpenseDraft): void {
    this.state.set(isBlank(draft) ? null : draft);
  }

  clear(): void {
    this.state.set(null);
  }

  rememberMethod(id: PaymentMethodId): void {
    this.last.set(id);
    try {
      localStorage.setItem(LAST_METHOD_KEY, id);
    } catch {
      /* private mode or full storage: the preference just lasts for this session */
    }
  }
}
