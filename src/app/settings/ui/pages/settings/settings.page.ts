import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppHeader, AmountInput, Button, SegmentedControl, ToastService, type SegmentOption } from '@pp/shared/ui';
import { SettingsStore } from '../../../application/settings.store';
import type { ThemePreference } from '../../../domain/app-settings';

const THEMES: readonly SegmentOption[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
];

@Component({
  selector: 'pp-settings-page',
  imports: [AppHeader, AmountInput, Button, RouterLink, SegmentedControl],
  template: `
    <pp-app-header title="Ajustes" subtitle="Umbral y tema" />
    <div class="flex flex-col gap-4 pb-6">
      <section class="glass flex flex-col gap-3 p-4" aria-label="Umbral hormiga">
        <h2 class="text-lg font-bold text-ink">Umbral hormiga</h2>
        <p class="text-sm text-ink-muted">
          Los gastos iguales o menores a este monto cuentan como gastos hormiga en tu análisis.
        </p>
        <pp-amount-input [currency]="settings.defaultCurrency()" [(valueMinor)]="threshold" />
        <pp-button [disabled]="!threshold()" (pressed)="saveThreshold()">Guardar umbral</pp-button>
      </section>

      <section class="flex flex-col gap-2" aria-label="Tema">
        <h2 class="px-1 text-sm font-semibold text-ink-muted">Tema</h2>
        <pp-segmented-control [options]="themes" [value]="settings.theme()" (valueChange)="setTheme($event)" />
      </section>

      <a routerLink="/settings/catalog" class="glass block rounded-2xl p-4 font-semibold text-ink">
        Categorías y métodos de pago
      </a>
      <a routerLink="/settings/backup" class="glass block rounded-2xl p-4 font-semibold text-ink">
        Importar datos de otra app
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);

  protected readonly themes = THEMES;
  protected readonly threshold = signal<number | null>(null);

  constructor() {
    // Show the saved threshold once settings finish loading.
    effect(() => {
      if (this.settings.ready()) this.threshold.set(this.settings.antExpenseThreshold().amountMinor);
    });
  }

  protected async saveThreshold(): Promise<void> {
    const amountMinor = this.threshold();
    if (!amountMinor) return;
    const result = await this.settings.update({
      antExpenseThreshold: { amountMinor, currency: this.settings.defaultCurrency() },
    });
    this.toast.show({ message: result.ok ? 'Umbral guardado' : 'No se pudo guardar el umbral' });
  }

  protected async setTheme(value: string): Promise<void> {
    const result = await this.settings.update({ theme: value as ThemePreference });
    if (!result.ok) this.toast.show({ message: 'No se pudo cambiar el tema' });
  }
}
