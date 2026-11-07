import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { currency, toIsoWithOffset, type CurrencyCode } from '@pp/shared/kernel';
import { AmountInput, Button, Chip, DateTimeField, Icon, TextField } from '@pp/shared/ui';
import type { Category, PaymentMethod } from '../../../domain/category';
import type { CategoryId, PaymentMethodId } from '../../../domain/ids';
import { MAX_WHAT_LENGTH } from '../../../domain/expense';
import type { ExpenseDraft } from '../../../domain/expense-draft';
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

type FormError = 'amount' | 'category' | 'method';

const MESSAGES: Record<FormError, string> = {
  amount: 'Ingresa un monto mayor a cero.',
  category: 'Elige una categoría.',
  method: 'Elige cómo pagaste.',
};

/** Quick-add / edit form. Presentational: validates the obvious, then emits a command for the store. */
@Component({
  selector: 'pp-expense-form',
  imports: [AmountInput, Button, CategoryPicker, Chip, DateTimeField, Icon, MethodPicker, PlaceField, TextField],
  template: `
    <form class="flex flex-col gap-5" novalidate (submit)="$event.preventDefault(); submit()">
      <div class="glass-strong relative flex flex-col items-center gap-1 px-4 pb-4 pt-8">
        <button
          type="button"
          class="absolute right-2 top-1 inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-ink-muted active:scale-95"
          [attr.aria-expanded]="showCurrencies()"
          [attr.aria-label]="'Moneda: ' + activeCurrency() + '. Cambiar'"
          (click)="showCurrencies.set(!showCurrencies())"
        >
          {{ activeCurrency() }}
          <pp-icon
            name="chevron-right"
            [size]="16"
            class="transition-transform"
            [class.rotate-90]="showCurrencies()"
          />
        </button>
        <pp-amount-input
          [currency]="activeCurrency()"
          [autofocus]="autofocus()"
          [(valueMinor)]="amountMinor"
          (submitted)="submit()"
        />
        @if (showError('amount')) {
          <span class="text-sm text-danger-text" role="alert">{{ messages.amount }}</span>
        }
        @if (showCurrencies()) {
          <div class="mt-1 flex flex-wrap justify-center gap-2">
            @for (code of allowedCurrencies(); track code) {
              <pp-chip [label]="code" [selected]="activeCurrency() === code" (toggled)="selectedCurrency.set(code)" />
            }
          </div>
        }
      </div>

      <div class="flex flex-col gap-1">
        <pp-category-picker [categories]="categories()" [(selectedId)]="categoryId" />
        @if (showError('category')) {
          <span class="px-1 text-sm text-danger-text" role="alert">{{ messages.category }}</span>
        }
      </div>

      <div class="flex flex-col gap-1">
        <pp-method-picker [methods]="methods()" [(selectedId)]="methodId" />
        @if (showError('method')) {
          <span class="px-1 text-sm text-danger-text" role="alert">{{ messages.method }}</span>
        }
      </div>

      <div class="flex flex-col gap-2">
        <pp-text-field
          label="Qué compraste (opcional)"
          [placeholder]="whatPlaceholder()"
          [maxLength]="maxWhat"
          [(value)]="what"
        />
        @if (whatSuggestions().length > 0) {
          <div class="scroll-row">
            @for (item of whatSuggestions(); track item) {
              <pp-chip [label]="item" [selected]="what() === item" (toggled)="what.set($event ? item : '')" />
            }
          </div>
        }
      </div>

      <div class="flex flex-col gap-4">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-1 self-start px-1 text-sm font-medium text-ink-muted"
          [attr.aria-expanded]="showDetails()"
          (click)="showDetails.set(!showDetails())"
        >
          {{ showDetails() ? 'Menos detalles' : 'Más detalles' }}
          <pp-icon name="chevron-right" [size]="16" class="transition-transform" [class.rotate-90]="showDetails()" />
        </button>
        @if (showDetails()) {
          <pp-place-field [suggestions]="placeSuggestions()" [(value)]="place" />
          <pp-date-time-field [max]="nowIso()" [value]="occurredAt()" (valueChange)="pickDate($event)" />
          <pp-text-field label="Nota" placeholder="Opcional" [maxLength]="200" [(value)]="note" />
        }
      </div>

      @if (serverError()) {
        <p class="text-center text-sm text-danger-text" role="alert">{{ serverError() }}</p>
      }

      <div
        class="glass sticky z-10 flex gap-3 p-2"
        style="bottom: calc(env(safe-area-inset-bottom) + var(--pp-bottom-offset, 88px))"
      >
        @if (saved()) {
          <pp-button variant="ghost" size="lg" (pressed)="undone.emit()">Deshacer</pp-button>
        } @else if (cancellable()) {
          <pp-button variant="ghost" size="lg" (pressed)="cancelled.emit()">Cancelar</pp-button>
        }
        <pp-button type="submit" size="lg" [block]="true" [loading]="busy()">
          @if (saved()) {
            <span class="pp-pop inline-flex items-center gap-2">
              <pp-icon name="check" [size]="20" />
              Guardado
            </span>
          } @else {
            {{ submitLabel() }}
          }
        </pp-button>
        <span class="sr-only" role="status">{{ saved() ? 'Gasto guardado' : '' }}</span>
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
  /** An unsaved entry to pick up where the user left off. Read once, when the form opens. */
  readonly draft = input<ExpenseDraft | null>(null);
  /** The method to pre-select on an empty form, usually the one used last. */
  readonly defaultMethodId = input<PaymentMethodId | null>(null);
  readonly submitLabel = input('Guardar gasto');
  readonly busy = input(false);
  readonly autofocus = input(false);
  readonly cancellable = input(false);
  /** Shows the "saved" confirmation in place of the save label, with an undo beside it. */
  readonly saved = input(false);
  /** A message from the domain or storage that does not belong to one field. */
  readonly serverError = input<string | null>(null);

  readonly submitted = output<ExpenseFormValue>();
  readonly cancelled = output<void>();
  readonly undone = output<void>();
  /** Every edit, so the page can keep the entry alive across navigation. A reset emits a blank draft. */
  readonly draftChange = output<ExpenseDraft>();

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
  /** True once the user chose a date, so an untouched form never keeps a stale "now". */
  private readonly dateTouched = signal(false);

  protected readonly activeCurrency = computed(() => this.selectedCurrency() ?? this.defaultCurrency());
  protected readonly nowIso = signal(toIsoWithOffset(new Date()));

  private readonly categoryName = computed(
    () => this.categories().find((c) => c.id === this.categoryId())?.name ?? 'Gasto',
  );

  protected readonly whatPlaceholder = computed(() =>
    this.categoryId() ? `Si lo dejas vacío: ${this.categoryName()}` : 'Ej. Café, chicle, pasaje',
  );

  private readonly errors = computed<readonly FormError[]>(() => {
    const found: FormError[] = [];
    if (!this.amountMinor() || this.amountMinor()! <= 0) found.push('amount');
    if (!this.categoryId()) found.push('category');
    if (!this.methodId()) found.push('method');
    return found;
  });

  private readonly snapshot = computed<ExpenseDraft>(() => ({
    amountMinor: this.amountMinor(),
    what: this.what(),
    categoryId: this.categoryId(),
    paymentMethodId: this.methodId(),
    place: this.place(),
    note: this.note(),
    occurredAt: this.dateTouched() ? this.occurredAt() : null,
    currency: this.selectedCurrency(),
  }));

  constructor() {
    effect(() => {
      const initial = this.initial();
      if (initial) untracked(() => this.load(initial));
    });
    effect(() => {
      const draft = this.draft();
      if (draft) untracked(() => this.restore(draft));
    });
    effect(() => {
      const preferred = this.defaultMethodId();
      const methods = this.methods();
      untracked(() => {
        if (!this.methodId() && preferred && methods.some((m) => m.id === preferred)) this.methodId.set(preferred);
      });
    });
    effect(() => this.draftChange.emit(this.snapshot()));
  }

  /** Clears everything for the next entry. The payment method stays: people mostly pay the same way. */
  reset(): void {
    this.amountMinor.set(null);
    this.what.set('');
    this.categoryId.set(null);
    this.place.set('');
    this.note.set('');
    this.occurredAt.set(toIsoWithOffset(new Date()));
    this.nowIso.set(toIsoWithOffset(new Date()));
    this.selectedCurrency.set(null);
    this.showCurrencies.set(false);
    this.showDetails.set(false);
    this.dateTouched.set(false);
    this.attempted.set(false);
  }

  protected pickDate(iso: string): void {
    this.occurredAt.set(iso);
    this.dateTouched.set(true);
  }

  protected showError(field: FormError): boolean {
    return this.attempted() && this.errors().includes(field);
  }

  protected submit(): void {
    if (this.saved()) return;
    this.attempted.set(true);
    if (this.busy() || this.errors().length > 0) return;
    this.submitted.emit({
      what: this.what().trim() || this.categoryName(),
      amountMinor: this.amountMinor() as number,
      currency: this.activeCurrency(),
      categoryId: this.categoryId() as string,
      paymentMethodId: this.methodId() as string,
      place: this.place().trim() || null,
      occurredAt: this.occurredAt(),
      note: this.note().trim() || null,
    });
  }

  /** Brings back an unsaved entry. A category or method archived in the meantime is dropped, not resurrected. */
  private restore(draft: ExpenseDraft): void {
    this.amountMinor.set(draft.amountMinor);
    this.what.set(draft.what);
    this.categoryId.set(this.categories().some((c) => c.id === draft.categoryId) ? draft.categoryId : null);
    this.methodId.set(this.methods().some((m) => m.id === draft.paymentMethodId) ? draft.paymentMethodId : null);
    this.place.set(draft.place);
    this.note.set(draft.note);
    this.selectedCurrency.set(draft.currency);
    if (draft.occurredAt) {
      this.occurredAt.set(draft.occurredAt);
      this.dateTouched.set(true);
    }
    this.showDetails.set(draft.occurredAt !== null || draft.note !== '' || draft.place !== '');
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
    this.showDetails.set(!!value.note || !!value.place);
  }
}
