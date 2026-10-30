import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppHeader, EmptyState } from '@pp/shared/ui';

/** Placeholder until the settings screen lands (WU-17). */
@Component({
  selector: 'pp-settings-page',
  imports: [AppHeader, EmptyState],
  template: `
    <pp-app-header title="Ajustes" subtitle="Moneda, umbral y tema" />
    <pp-empty-state icon="settings" title="Pronto" message="Aquí podrás ajustar tus preferencias." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
