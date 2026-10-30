import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppHeader, EmptyState } from '@pp/shared/ui';

/** Placeholder until the settings screen lands (WU-17). */
@Component({
  selector: 'pp-settings-page',
  imports: [AppHeader, EmptyState, RouterLink],
  template: `
    <pp-app-header title="Ajustes" subtitle="Moneda, umbral y tema" />
    <pp-empty-state icon="settings" title="Pronto" message="Aquí podrás ajustar tus preferencias." />
    <a routerLink="/settings/backup" class="glass mt-4 block rounded-2xl p-4 font-semibold text-ink">Respaldo e importación</a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
