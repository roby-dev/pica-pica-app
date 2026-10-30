import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface RankRow {
  readonly key: string;
  readonly label: string;
  /** Pre-formatted amount. */
  readonly valueText: string;
  /** Fraction of the group, 0 to 1. Drives the bar. */
  readonly share: number;
  readonly count: number;
}

/** Ranked rows with a thin share bar under each. Used for places and payment methods. */
@Component({
  selector: 'pp-rank-list',
  template: `
    <ol class="flex flex-col gap-3">
      @for (row of rows(); track row.key) {
        <li class="flex flex-col gap-1.5">
          <div class="flex items-baseline gap-2">
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-ink">
              {{ row.label }}
            </span>
            <span class="text-xs text-ink-muted">{{ row.count }} {{ row.count === 1 ? 'gasto' : 'gastos' }}</span>
            <span class="text-sm font-semibold tabular-nums text-ink">{{ row.valueText }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
            <div class="h-full rounded-full bg-accent" [style.width.%]="row.share * 100"></div>
          </div>
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class RankList {
  readonly rows = input.required<readonly RankRow[]>();
}
