import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { totalFor } from '@pp/shared/kernel';
import { StatCard, ToastService } from '@pp/shared/ui';
import type { ExpenseId } from '../../../domain/ids';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpensesStore } from '../../../application/expenses.store';
import { ExpenseForm, type ExpenseFormValue } from '../../components/expense-form/expense-form';

@Component({
  selector: 'pp-quick-add-page',
  imports: [ExpenseForm, StatCard],
  template: `
    <div class="flex flex-col gap-5 px-4 pb-6 pt-4">
      <div class="grid grid-cols-2 gap-3">
        <pp-stat-card label="Hoy" [money]="today()" />
        <pp-stat-card label="Esta semana" [money]="week()" />
      </div>
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
        (submitted)="save($event)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddPage {
  protected readonly catalog = inject(CatalogStore);
  protected readonly expenses = inject(ExpensesStore);
  private readonly toast = inject(ToastService);

  private readonly form = viewChild.required<ExpenseForm>('form');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly today = computed(() => totalFor(this.expenses.todayTotals(), this.expenses.defaultCurrency()));
  protected readonly week = computed(() => totalFor(this.expenses.weekTotals(), this.expenses.defaultCurrency()));

  protected async save(value: ExpenseFormValue): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.expenses.add(value);
      if (!result.ok) {
        this.error.set(result.error.message);
        return;
      }
      this.saved(result.value.id);
    } catch {
      this.error.set('No se pudo guardar el gasto. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  private saved(id: ExpenseId): void {
    this.form().reset();
    this.toast.show({
      message: 'Gasto guardado',
      actionLabel: 'Deshacer',
      onAction: () => void this.expenses.remove(id),
    });
  }
}
