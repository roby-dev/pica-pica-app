import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { CurrencyCode } from '@pp/shared/kernel';
import { SegmentedControl } from '@pp/shared/ui';

/** One segment per currency with spending. The page only renders it when there is more than one. */
@Component({
  selector: 'pp-currency-switcher',
  imports: [SegmentedControl],
  template: `
    <pp-segmented-control [options]="options()" [value]="value() ?? ''" (valueChange)="value.set($any($event))" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class CurrencySwitcher {
  readonly currencies = input.required<readonly CurrencyCode[]>();
  readonly value = model<CurrencyCode | null>(null);

  protected readonly options = computed(() => this.currencies().map((code) => ({ value: code, label: code })));
}
