import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Money } from '@pp/shared/kernel';
import { AmountText } from '@pp/shared/ui';
import { ExpenseRow, type ExpenseRowVm } from '../expense-row/expense-row';

export interface DayGroupVm {
  readonly dayKey: string;
  readonly dayLabel: string;
  /** One entry per currency; currencies are never added together. */
  readonly totals: readonly Money[];
  readonly rows: readonly ExpenseRowVm[];
}

@Component({
  selector: 'pp-day-group',
  imports: [AmountText, ExpenseRow],
  template: `
    <section class="flex flex-col gap-1" [attr.aria-label]="group().dayLabel">
      <header class="flex items-baseline justify-between gap-3 px-1">
        <h2 class="text-sm font-semibold capitalize text-ink-muted">{{ group().dayLabel }}</h2>
        <span class="flex flex-wrap justify-end gap-x-3 text-sm text-ink-muted">
          @for (total of group().totals; track total.currency) {
            <pp-amount-text [money]="total" emphasis="sm" />
          }
        </span>
      </header>
      <div class="glass flex flex-col divide-y divide-[var(--glass-border)] px-3">
        @for (row of group().rows; track row.id) {
          <pp-expense-row [row]="row" (opened)="opened.emit($event)" (deleteRequested)="deleteRequested.emit($event)" />
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DayGroup {
  readonly group = input.required<DayGroupVm>();

  readonly opened = output<string>();
  readonly deleteRequested = output<string>();
}
