import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_LOCALE, Money } from '@pp/shared/kernel';

export type AmountEmphasis = 'sm' | 'md' | 'xl';

const EMPHASIS_CLASS: Record<AmountEmphasis, string> = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  xl: 'text-4xl font-bold tracking-tight',
};

@Component({
  selector: 'pp-amount-text',
  template: '{{ text() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class AmountText {
  readonly money = input.required<Money>();
  readonly locale = input(DEFAULT_LOCALE);
  readonly emphasis = input<AmountEmphasis>('md');
  /** Shows a leading minus, used for spending lines. */
  readonly signed = input(false);

  protected readonly text = computed(() => {
    const formatted = Money.format(this.money(), this.locale());
    return this.signed() ? `−${formatted}` : formatted;
  });

  protected readonly classes = computed(
    () => `tabular-nums whitespace-nowrap ${EMPHASIS_CLASS[this.emphasis()]}`,
  );
}
