import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_LOCALE, Money, minorExponent, parseCurrency } from '@pp/shared/kernel';
import {
  AppHeader, AmountInput, AmountText, Button, SegmentedControl, TextField, ToastService, parseAmountToMinor,
  type SegmentOption,
} from '@pp/shared/ui';
import { SettingsStore } from '../../../application/settings.store';
import type { ThemePreference } from '../../../domain/app-settings';

const currencyNames = new Intl.DisplayNames(DEFAULT_LOCALE, { type: 'currency' });
const CURRENCIES = Intl.supportedValuesOf('currency').map((code) => ({ code, name: currencyNames.of(code) }));

const THEMES: readonly SegmentOption[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
];

@Component({
  selector: 'pp-settings-page',
  imports: [AppHeader, AmountInput, AmountText, Button, RouterLink, SegmentedControl, TextField],
  template: `
    <pp-app-header title="Ajustes" subtitle="Presupuesto, umbral y tema" />
    <div class="flex flex-col gap-4 pb-6">
      <section class="glass flex flex-col gap-3 p-4" aria-label="Umbral hormiga">
        <h2 class="text-lg font-bold text-ink">Umbral hormiga</h2>
        <p class="text-sm text-ink-muted">
          Los gastos iguales o menores a este monto cuentan como gastos hormiga en tu análisis.
        </p>
        <pp-amount-input [currency]="settings.defaultCurrency()" [(valueMinor)]="threshold" />
        <pp-button [disabled]="!threshold()" (pressed)="saveThreshold()">Guardar umbral</pp-button>
      </section>

      <section class="glass flex flex-col gap-3 p-4" aria-label="Presupuesto semanal">
        <h2 class="text-lg font-bold text-ink">Presupuesto semanal</h2>
        <p class="text-sm text-ink-muted">
          Define un tope por moneda. Todos tus gastos registrados cuentan, sin importar el umbral hormiga.
        </p>
        @if (settings.ready()) {
          @if (settings.weeklyBudgets().length) {
            <ul class="flex flex-col gap-1 text-ink">
              @for (cap of settings.weeklyBudgets(); track cap.currency) {
                <li class="flex justify-between gap-3">
                  <span>{{ cap.currency }}</span>
                  <pp-amount-text [money]="cap" />
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-ink-muted">Aún no tienes topes semanales.</p>
          }
          <form (submit)="$event.preventDefault(); saveBudget()">
            <fieldset class="flex min-w-0 flex-col gap-3" [disabled]="budgetBusy()">
              <label class="flex flex-col gap-1.5" for="weekly-budget-currency">
                <span class="px-1 text-sm font-medium text-ink-muted">Moneda</span>
                <select
                  id="weekly-budget-currency"
                  class="glass min-h-12 w-full px-4 text-base text-ink"
                  (change)="selectBudgetCurrency($event)"
                >
                  @for (choice of currencies; track choice.code) {
                    <option [value]="choice.code" [selected]="choice.code === budgetCurrency()">
                      {{ choice.code }} — {{ choice.name }}
                    </option>
                  }
                </select>
              </label>
              <pp-text-field label="Monto del tope" inputmode="decimal" [(value)]="budgetDraft" />
              <div class="flex flex-wrap gap-2">
                <pp-button type="submit" [disabled]="budgetMinor() === null">Guardar tope</pp-button>
                @if (selectedBudget()) {
                  <pp-button variant="ghost" (pressed)="removeBudget()">Quitar tope</pp-button>
                }
              </div>
            </fieldset>
          </form>
        }
      </section>

      <section class="flex flex-col gap-2" aria-label="Tema">
        <h2 class="px-1 text-sm font-semibold text-ink-muted">Tema</h2>
        <pp-segmented-control [options]="themes" [value]="settings.theme()" (valueChange)="setTheme($event)" />
      </section>

      <a routerLink="/settings/catalog" class="glass block rounded-2xl p-4 font-semibold text-ink">
        Categorías y métodos de pago
      </a>
      <a routerLink="/settings/backup" class="glass block rounded-2xl p-4 font-semibold text-ink">
        Respaldo e importación
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
  protected readonly currencies = CURRENCIES;
  protected readonly budgetBusy = signal(false);
  protected readonly budgetCurrency = linkedSignal(() => this.settings.defaultCurrency());
  protected readonly selectedBudget = computed(() =>
    this.settings.weeklyBudgets().find((cap) => cap.currency === this.budgetCurrency()),
  );
  protected readonly budgetDraft = linkedSignal(() => {
    const decimals = minorExponent(this.budgetCurrency());
    const cap = this.selectedBudget();
    if (!cap) return '';
    // Avoid converting a large, exact minor-unit integer through a floating-point major amount.
    const digits = String(cap.amountMinor).padStart(decimals + 1, '0');
    return decimals ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}` : digits;
  });
  protected readonly budgetMinor = computed(() => {
    const text = this.budgetDraft().trim();
    if (!/^[\d.,]+$/.test(text)) return null;
    const minor = parseAmountToMinor(text, minorExponent(this.budgetCurrency()));
    return minor !== null && minor > 0 ? minor : null;
  });

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

  protected selectBudgetCurrency(event: Event): void {
    const parsed = parseCurrency((event.target as HTMLSelectElement).value);
    if (parsed.ok) this.budgetCurrency.set(parsed.value);
  }

  protected async saveBudget(): Promise<void> {
    const minor = this.budgetMinor();
    if (minor === null) return;
    const cap = Money.fromMinor(minor, this.budgetCurrency());
    const caps = this.settings.weeklyBudgets();
    await this.persistBudgets(
      this.selectedBudget() ? caps.map((old) => old.currency === cap.currency ? cap : old) : [...caps, cap],
      'Tope guardado',
    );
  }

  protected async removeBudget(): Promise<void> {
    if (!this.selectedBudget()) return;
    await this.persistBudgets(
      this.settings.weeklyBudgets().filter((cap) => cap.currency !== this.budgetCurrency()),
      'Tope eliminado',
    );
  }

  private async persistBudgets(weeklyBudgets: readonly Money[], message: string): Promise<void> {
    if (this.budgetBusy()) return;
    this.budgetBusy.set(true);
    const failure = 'No se pudo actualizar el presupuesto';
    try {
      const result = await this.settings.update({ weeklyBudgets });
      this.toast.show({ message: result.ok ? message : failure });
    } catch {
      this.toast.show({ message: failure });
    } finally {
      this.budgetBusy.set(false);
    }
  }

  protected async setTheme(value: string): Promise<void> {
    const result = await this.settings.update({ theme: value as ThemePreference });
    if (!result.ok) this.toast.show({ message: 'No se pudo cambiar el tema' });
  }
}
