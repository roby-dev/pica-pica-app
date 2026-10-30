import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppHeader, EmptyState } from '@pp/shared/ui';

/** Placeholder until the quick-add form lands (WU-13). */
@Component({
  selector: 'pp-quick-add-page',
  imports: [AppHeader, EmptyState],
  template: `
    <pp-app-header title="Agregar" subtitle="Registra un gasto hormiga" />
    <pp-empty-state icon="coin" title="Pronto" message="Aquí podrás registrar un gasto en segundos." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddPage {}
