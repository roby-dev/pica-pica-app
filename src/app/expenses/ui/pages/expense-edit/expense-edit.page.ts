import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppHeader, EmptyState } from '@pp/shared/ui';

/** Placeholder until editing lands (WU-14). */
@Component({
  selector: 'pp-expense-edit-page',
  imports: [AppHeader, EmptyState],
  template: `
    <pp-app-header title="Editar gasto" [showBack]="true" (back)="location.back()" />
    <pp-empty-state icon="edit" title="Pronto" message="Aquí podrás corregir un gasto." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseEditPage {
  protected readonly location = inject(Location);
}
