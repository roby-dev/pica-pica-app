import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_LOCALE } from '@pp/shared/kernel';
import { AppHeader, Chip, EmptyState, SearchBar, ToastService } from '@pp/shared/ui';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpensesStore } from '../../../application/expenses.store';
import type { ExpenseId } from '../../../domain/ids';
import { ExpenseList } from '../../components/expense-list/expense-list';
import { filterHistory, toDayGroups } from './history-view';

@Component({
  selector: 'pp-history-page',
  imports: [AppHeader, Chip, EmptyState, ExpenseList, SearchBar],
  template: `
    <pp-app-header title="Historial" subtitle="Tus gastos por día" />
    <div class="flex flex-col gap-4 px-4 pb-6">
      <pp-search-bar placeholder="Buscar gasto, lugar o nota" [(query)]="query" />
      <div class="scroll-row" role="group" aria-label="Filtrar por categoría">
        @for (category of catalog.categories(); track category.id) {
          <pp-chip
            [label]="category.name"
            [emoji]="category.emoji"
            [color]="category.color"
            [selected]="categoryId() === category.id"
            (toggled)="categoryId.set($event ? category.id : null)"
          />
        }
      </div>

      @if (!expenses.isLoading() && groups().length === 0) {
        @if (expenses.all().length === 0) {
          <pp-empty-state icon="list" title="Sin gastos todavía" message="Cuando registres gastos aparecerán aquí." />
        } @else {
          <pp-empty-state icon="search" title="Nada coincide" message="Prueba con otra búsqueda o quita el filtro." />
        }
      } @else {
        <pp-expense-list
          [groups]="groups()"
          [loading]="expenses.isLoading()"
          (opened)="open($event)"
          (deleteRequested)="remove($event)"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  protected readonly catalog = inject(CatalogStore);
  protected readonly expenses = inject(ExpensesStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly query = signal('');
  protected readonly categoryId = signal<string | null>(null);

  protected readonly groups = computed(() =>
    toDayGroups(filterHistory(this.expenses.all(), { query: this.query(), categoryId: this.categoryId() }), {
      now: this.expenses.now(),
      locale: DEFAULT_LOCALE,
      threshold: this.expenses.antThreshold(),
      categories: this.catalog.categoryById(),
      methods: this.catalog.methodById(),
    }),
  );

  protected open(id: string): void {
    void this.router.navigate(['/history', id]);
  }

  protected async remove(id: string): Promise<void> {
    const result = await this.expenses.remove(id as ExpenseId);
    if (!result.ok) {
      this.toast.show({ message: 'No se pudo eliminar el gasto' });
      return;
    }
    this.toast.show({
      message: 'Gasto eliminado',
      actionLabel: 'Deshacer',
      onAction: () => void this.expenses.undoRemove(),
    });
  }
}
