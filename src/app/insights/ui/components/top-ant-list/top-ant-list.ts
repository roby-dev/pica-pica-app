import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Money } from '@pp/shared/kernel';
import { AmountText } from '@pp/shared/ui';

export interface TopAntRow {
  readonly key: string;
  readonly what: string;
  readonly place: string | null;
  readonly count: number;
  readonly total: Money;
}

/** The habits that cost the most: what you keep buying, where, how often and what it adds up to. */
@Component({
  selector: 'pp-top-ant-list',
  imports: [AmountText],
  template: `
    <ol class="flex flex-col divide-y divide-[var(--glass-border)]">
      @for (item of items(); track item.key; let i = $index) {
        <li class="flex items-center gap-3 py-3">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full border-[0.5px] border-chip-border bg-chip text-sm font-bold text-ink"
            aria-hidden="true"
            >{{ i + 1 }}</span
          >
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-base font-semibold text-ink">{{ item.what }}</span>
            <span class="truncate text-sm text-ink-muted">
              {{ item.count }} {{ item.count === 1 ? 'vez' : 'veces' }}{{ item.place ? ' · ' + item.place : '' }}
            </span>
          </span>
          <pp-amount-text [money]="item.total" emphasis="md" />
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TopAntList {
  readonly items = input.required<readonly TopAntRow[]>();
}
