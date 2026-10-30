import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { currency, toIsoWithOffset, type CurrencyCode } from '@pp/shared/kernel';
import { AmountInput, Button, Chip, DateTimeField, TextField } from '@pp/shared/ui';
import type { Category, PaymentMethod } from '../../../domain/category';
import type { CategoryId, PaymentMethodId } from '../../../domain/ids';
import { MAX_WHAT_LENGTH } from '../../../domain/expense';
import { CategoryPicker } from '../category-picker/category-picker';
import { MethodPicker } from '../method-picker/method-picker';
import { PlaceField } from '../place-field/place-field';

/** What the form emits. Structurally the same as the store's command, so pages can hand it straight over. */
export interface ExpenseFormValue {
  readonly what: string;
  readonly amountMinor: number;
  readonly currency?: CurrencyCode;
  readonly categoryId: string;
  readonly paymentMethodId: string;
  readonly place?: string | null;
  readonly occurredAt: string;
  readonly note?: string | null;
}

type FormError = 'what' | 'amount' | 'category' | 'method';

const MESSAGES: Record<FormError, string> = {
  what: 'Cuéntame qué compraste.',
  amount: 'Ingresa un monto mayor a cero.',
  category: 'Elige una categoría.',
  method: 'Elige cómo pagaste.',
};

/** Quick-add / edit form. Presentational: validates the obvious, then emits a command for the store. */
@Component({
  selector: 'pp-expense-form',
  imports: [AmountInput, Button, CategoryPicker, Chip, DateTimeField, MethodPicker, PlaceField, TextField],
  template: `
    <form class="flex flex-col gap-5" novalidate (submit)="$event.preventDefault(); submit()">
      <div class="glass-strong flex flex-col items-center gap-1 px-4 py-6">
        <pp-amount-input
          [currency]="activeCurrency()"
          [autofocus]="autofocus()"
          [(valueMinor)]="amountMinor"
          (submitted)="submit()"
        />
        @if (showError('amount')) {
          <span class="text-sm text-[oklch(0.5_0.15_20)]" role="alert">{{ messages.amount }}</span>
        }
        <button
          type="button"
          class="mt-1 min-h-11 px-3 text-sm font-medium text-ink-muted underline-offset-4 active:underline"
          (click)="showCurrencies.set(!showCurrencies())"
        >
          Cambiar moneda
        </button>
        @if (showCurrencies()) {
          <div class="flex flex-wrap justify-center gap-2">
            @for (code of allowedCurrencies(); track code) {
              <pp-chip [label]="code" [selected]="activeCurrency() === code" (toggled)="selectedCurrency.set(code)" />
            }
          </div>
        }
      </div>

      <div class="flex flex-col gap-2">
        <pp-text-field
          label="Qué compraste"
          placeholder="Ej. Café, chicle, pasaje"
          [maxLength]="maxWhat"
          [error]="showError('what') ? messages.what : null"
          [(value)]="what"
        />
        @if (whatSuggestions().length > 0) {
          <div class="flex flex-wrap gap-2">
            @for (item of whatSuggestions(); track item) {
              <pp-chip [label]="item" [selected]="what() === item" (toggled)="what.set($event ? item : '')" />
            }
          </div>
        }
      </div>

      <div class="flex flex-col gap-1">
        <pp-category-picker [categories]="categories()" [(selectedId)]="categoryId" />
        @if (showError('category')) {
          <span class="px-1 text-sm text-[oklch(0.5_0.15_20)]" role="alert">{{ messages.category }}</span>
        }
      </div>

      <div class="flex flex-col gap-1">
        <pp-method-picker [methods]="methods()" [(selectedId)]="methodId" />
        @if (showError('method')) {
          <span class="px-1 text-sm text-[oklch(0.5_0.15_20)]" role="alert">{{ messages.method }}</span>
        }
      </div>

      <pp-place-field [suggestions]="placeSuggestions()" [(value)]="place" />

      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="min-h-11 self-start px-1 text-sm font-medium text-ink-muted"
          [attr.aria-expanded]="showDetails()"
          (click)="showDetails.set(!showDetails())"
        >
          {{ showDetails() ? 'Ocultar fecha y nota' : 'Cambiar fecha o agregar nota' }}
        </button>
        @if (showDetails()) {
          <pp-date-time-field [max]="nowIso()" [(value)]="occurredAt" />
          <pp-text-field label="Nota" placeholder="Opcional" [maxLength]="200" [(value)]="note" />
        }
      </div>

      @if (serverError()) {
        <p class="text-center text-sm text-[oklch(0.5_0.15_20)]" role="alert">{{ serverError() }}</p>
      }

      <div class="flex gap-3">
        @if (cancellable()) {
          <pp-button variant="ghost" size="lg" (pressed)="cancelled.emit()">Cancelar</pp-button>
        }
        <pp-button type="submit" size="lg" [block]="true" [loading]="busy()">
          {{ submitLabel() }}
        </pp-button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ExpenseForm {
  protected readonly messages = MESSAGES;
  protected readonly maxWhat = MAX_WHAT_LENGTH;

  readonly categories = input.required<readonly Category[]>();
  readonly methods = input.required<readonly PaymentMethod[]>();
  readonly whatSuggestions = input<readonly string[]>([]);
  readonly placeSuggestions = input<readonly string[]>([]);
  readonly defaultCurrency = input.required<CurrencyCode>();
  readonly allowedCurrencies = input<readonly CurrencyCode[]>([currency('PEN'), currency('USD'), currency('EUR')]);
  readonly initial = input<ExpenseFormValue>();
  readonly submitLabel = input('Guardar gasto');
  readonly busy = input(false);
  readonly autofocus = input(false);
  readonly cancellable = input(false);
  /** A message from the domain or storage that does not belong to one field. */
  readonly serverError = input<string | null>(null);

  readonly submitted = output<ExpenseFormValue>();
  readonly cancelled = output<void>();

  protected readonly amountMinor = signal<number | null>(null);
  protected readonly what = signal('');
  protected readonly categoryId = signal<CategoryId | null>(null);
  protected readonly methodId = signal<PaymentMethodId | null>(null);
  protected readonly place = signal('');
  protected readonly note = signal('');
  protected readonly occurredAt = signal(toIsoWithOffset(new Date()));
  protected readonly selectedCurrency = signal<CurrencyCode | null>(null);
  protected readonly showCurrencies = signal(false);
  protected readonly showDetails = signal(false);
  private readonly attempted = signal(false);

  protected readonly activeCurrency = computed(() => this.selectedCurrency() ?? this.defaultCurrency());
  protected readonly nowIso = signal(toIsoWithOffset(new Date()));

  private readonly errors = computed<readonly FormError[]>(() => {
    const found: FormError[] = [];
    if (this.what().trim() === '') found.push('what');
    if (!this.amountMinor() || this.amountMinor()! <= 0) found.push('amount');
    if (!this.categoryId()) found.push('category');
    if (!this.methodId()) found.push('method');
    return found;
  });

  constructor() {
    effect(() => {
      const initial = this.initial();
      if (initial) untracked(() => this.load(initial));
    });
  }

  /** Clears everything for the next entry, keeping the defaults. */
  reset(): void {
    this.amountMinor.set(null);
    this.what.set('');
    this.categoryId.set(null);
    this.methodId.set(null);
    this.place.set('');
    this.note.set('');
    this.occurredAt.set(toIsoWithOffset(new Date()));
    this.nowIso.set(toIsoWithOffset(new Date()));
    this.selectedCurrency.set(null);
    this.showCurrencies.set(false);
    this.showDetails.set(false);
    this.attempted.set(false);
  }

  protected showError(field: FormError): boolean {
    return this.attempted() && this.errors().includes(field);
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.busy() || this.errors().length > 0) return;
    this.submitted.emit({
      what: this.what().trim(),
      amountMinor: this.amountMinor() as number,
      currency: this.activeCurrency(),
      categoryId: this.categoryId() as string,
      paymentMethodId: this.methodId() as string,
      place: this.place().trim() || null,
      occurredAt: this.occurredAt(),
      note: this.note().trim() || null,
    });
  }

  private load(value: ExpenseFormValue): void {
    this.amountMinor.set(value.amountMinor);
    this.what.set(value.what);
    this.categoryId.set(value.categoryId as CategoryId);
    this.methodId.set(value.paymentMethodId as PaymentMethodId);
    this.place.set(value.place ?? '');
    this.note.set(value.note ?? '');
    this.occurredAt.set(value.occurredAt);
    this.selectedCurrency.set(value.currency ?? null);
    this.showDetails.set(!!value.note);
  }
}
