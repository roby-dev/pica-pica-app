import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { totalFor } from '@pp/shared/kernel';
import { AmountText } from '@pp/shared/ui';
import type { ExpenseDraft } from '../../../domain/expense-draft';
import type { ExpenseId } from '../../../domain/ids';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpenseDraftStore } from '../../../application/expense-draft.store';
import { ExpensesStore } from '../../../application/expenses.store';
import { ExpenseForm, type ExpenseFormValue } from '../../components/expense-form/expense-form';

/** How long the saved confirmation (and its undo) stays up. */
const SAVED_MS = 4000;

@Component({
  selector: 'pp-quick-add-page',
  imports: [AmountText, ExpenseForm],
  template: `
    <div class="flex flex-col gap-5 pb-6 pt-4">
      <p class="flex items-baseline justify-center gap-x-5 text-sm text-ink-muted">
        <span>Hoy <pp-amount-text [money]="today()" emphasis="md" class="text-ink" /></span>
        <span>Esta semana <pp-amount-text [money]="week()" emphasis="md" class="text-ink" /></span>
      </p>
      <pp-expense-form
        #form
        [categories]="catalog.activeCategories()"
        [methods]="catalog.activeMethods()"
        [whatSuggestions]="expenses.recentWhats()"
        [placeSuggestions]="expenses.recentPlaces()"
        [defaultCurrency]="expenses.defaultCurrency()"
        [busy]="busy()"
        [serverError]="error()"
        [autofocus]="true"
        [draft]="initialDraft"
        [defaultMethodId]="drafts.lastMethodId()"
        [saved]="savedId() !== null"
        (draftChange)="onDraft($event)"
        (submitted)="save($event)"
        (undone)="undo()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddPage {
  protected readonly catalog = inject(CatalogStore);
  protected readonly expenses = inject(ExpensesStore);
  protected readonly drafts = inject(ExpenseDraftStore);

  /** Captured once: the form restores it on open, then owns the live state. */
  protected readonly initialDraft = this.drafts.current();

  private readonly form = viewChild.required<ExpenseForm>('form');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The expense just saved, while its "Guardado / Deshacer" confirmation is on screen. */
  protected readonly savedId = signal<ExpenseId | null>(null);
  private savedTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly today = computed(() => totalFor(this.expenses.todayTotals(), this.expenses.defaultCurrency()));
  protected readonly week = computed(() => totalFor(this.expenses.weekTotals(), this.expenses.defaultCurrency()));

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.savedTimer));
  }

  /** Starting a new entry ends the undo window; the empty draft a reset emits does not. */
  protected onDraft(draft: ExpenseDraft): void {
    this.drafts.save(draft);
    if (this.drafts.current()) this.dismissSaved();
  }

  protected undo(): void {
    const id = this.savedId();
    if (!id) return;
    this.dismissSaved();
    void this.expenses.remove(id);
  }

  protected async save(value: ExpenseFormValue): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.expenses.add(value);
      if (!result.ok) {
        this.error.set(result.error.message);
        return;
      }
      this.drafts.rememberMethod(result.value.paymentMethodId);
      this.saved(result.value.id);
    } catch {
      this.error.set('No se pudo guardar el gasto. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  private saved(id: ExpenseId): void {
    this.form().reset();
    this.savedId.set(id);
    clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => this.savedId.set(null), SAVED_MS);
    if ('vibrate' in navigator) navigator.vibrate(12);
  }

  private dismissSaved(): void {
    clearTimeout(this.savedTimer);
    this.savedId.set(null);
  }
}
