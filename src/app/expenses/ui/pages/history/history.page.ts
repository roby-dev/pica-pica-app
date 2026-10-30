import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppHeader, EmptyState } from '@pp/shared/ui';

/** Placeholder until the history list lands (WU-14). */
@Component({
  selector: 'pp-history-page',
  imports: [AppHeader, EmptyState],
  template: `
    <pp-app-header title="Historial" subtitle="Tus gastos por día" />
    <pp-empty-state icon="list" title="Sin gastos todavía" message="Cuando registres gastos aparecerán aquí." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {}
