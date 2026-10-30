import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AppHeader, Button, EmptyState, ToastService } from '@pp/shared/ui';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpensesStore } from '../../../application/expenses.store';
import type { ExpenseId } from '../../../domain/ids';
import { ExpenseForm, type ExpenseFormValue } from '../../components/expense-form/expense-form';

@Component({
  selector: 'pp-expense-edit-page',
  imports: [AppHeader, Button, EmptyState, ExpenseForm],
  template: `
    <pp-app-header title="Editar gasto" [showBack]="true" (back)="location.back()" />
    <div class="flex flex-col gap-4 px-4 pb-6">
      @if (initial(); as value) {
        <pp-expense-form
          [categories]="categories()"
          [methods]="methods()"
          [whatSuggestions]="expenses.recentWhats()"
          [placeSuggestions]="expenses.recentPlaces()"
          [defaultCurrency]="expenses.defaultCurrency()"
          [initial]="value"
          [busy]="busy()"
          [serverError]="error()"
          [cancellable]="true"
          submitLabel="Guardar cambios"
          (submitted)="save($event)"
          (cancelled)="location.back()"
        />
        <pp-button variant="danger" [block]="true" (pressed)="remove()">Eliminar gasto</pp-button>
      } @else if (!expenses.isLoading()) {
        <pp-empty-state icon="search" title="No encontramos este gasto" message="Puede que ya se haya eliminado." />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseEditPage {
  protected readonly location = inject(Location);
  protected readonly expenses = inject(ExpensesStore);
  private readonly catalog = inject(CatalogStore);
  private readonly toast = inject(ToastService);

  /** Bound from the `:id` route segment. */
  readonly id = input.required<string>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly expense = computed(() => this.expenses.getById(this.id() as ExpenseId));

  protected readonly initial = computed<ExpenseFormValue | undefined>(() => {
    const e = this.expense();
    if (!e) return undefined;
    return {
      what: e.what,
      amountMinor: e.amount.amountMinor,
      currency: e.amount.currency,
      categoryId: e.categoryId,
      paymentMethodId: e.paymentMethodId,
      place: e.place,
      occurredAt: e.occurredAt,
      note: e.note,
    };
  });

  /** Archived items stay selectable here only when this very expense already uses them. */
  protected readonly categories = computed(() =>
    this.catalog.categories().filter((c) => !c.archived || c.id === this.expense()?.categoryId),
  );
  protected readonly methods = computed(() =>
    this.catalog.methods().filter((m) => !m.archived || m.id === this.expense()?.paymentMethodId),
  );

  protected async save(value: ExpenseFormValue): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.expenses.update(this.id() as ExpenseId, value);
      if (!result.ok) {
        this.error.set(result.error.message);
        return;
      }
      this.toast.show({ message: 'Cambios guardados' });
      this.location.back();
    } catch {
      this.error.set('No se pudo guardar los cambios. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    try {
      const result = await this.expenses.remove(this.id() as ExpenseId);
      if (!result.ok) {
        this.error.set(result.error.message);
        return;
      }
      this.toast.show({
        message: 'Gasto eliminado',
        actionLabel: 'Deshacer',
        onAction: () => void this.expenses.undoRemove(),
      });
      this.location.back();
    } catch {
      this.error.set('No se pudo eliminar el gasto. Inténtalo de nuevo.');
    }
  }
}
