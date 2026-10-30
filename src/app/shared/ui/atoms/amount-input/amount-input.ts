import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  effect,
  ElementRef,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { DEFAULT_LOCALE, minorExponent, type CurrencyCode } from '@pp/shared/kernel';
import { parseAmountToMinor } from './parse-amount';

/** Large, thumb-friendly amount entry with the decimal keypad. Emits minor units. */
@Component({
  selector: 'pp-amount-input',
  template: `
    <label class="flex items-baseline justify-center gap-2" [attr.for]="inputId">
      <span class="text-2xl font-semibold text-ink-muted">{{ symbol() }}</span>
      <input
        #field
        [id]="inputId"
        type="text"
        inputmode="decimal"
        enterkeyhint="done"
        autocomplete="off"
        autocorrect="off"
        placeholder="0.00"
        aria-label="Monto"
        class="w-[8ch] min-w-0 bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-ink/25"
        [value]="text"
        (input)="onInput($event)"
        (keydown.enter)="submitted.emit()"
      />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AmountInput {
  private static nextId = 0;

  readonly currency = input.required<CurrencyCode>();
  readonly locale = input(DEFAULT_LOCALE);
  readonly autofocus = input(false);

  readonly valueMinor = model<number | null>(null);
  readonly submitted = output<void>();

  protected readonly inputId = `pp-amount-${AmountInput.nextId++}`;
  protected text = '';

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly exponent = computed(() => minorExponent(this.currency()));

  protected readonly symbol = computed(() => {
    const part = new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: this.currency(),
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? this.currency();
  });

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) this.field().nativeElement.focus();
    });

    // Keep the text in step when the parent sets or clears the value.
    effect(() => {
      const minor = this.valueMinor();
      const exponent = this.exponent();
      untracked(() => {
        if (minor === parseAmountToMinor(this.text, exponent)) return;
        this.text = minor === null ? '' : (minor / 10 ** exponent).toFixed(exponent);
        const el = this.field().nativeElement;
        el.value = this.text;
      });
    });
  }

  protected onInput(event: Event): void {
    this.text = (event.target as HTMLInputElement).value;
    this.valueMinor.set(parseAmountToMinor(this.text, this.exponent()));
  }
}
