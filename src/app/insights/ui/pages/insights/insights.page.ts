import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppHeader, EmptyState } from '@pp/shared/ui';

/** Placeholder until insights land (WU-16). */
@Component({
  selector: 'pp-insights-page',
  imports: [AppHeader, EmptyState],
  template: `
    <pp-app-header title="Análisis" subtitle="Dónde se va tu plata" />
    <pp-empty-state icon="chart" title="Pronto" message="Aquí verás tus totales y tendencias." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {}
