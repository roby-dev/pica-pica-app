import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Money } from '@pp/shared/kernel';
import { AmountText } from '../../atoms/amount-text/amount-text';
import { Badge } from '../../atoms/badge/badge';

export interface Trend {
  readonly deltaPct: number;
  /** `up` means spending went up. */
  readonly direction: 'up' | 'down' | 'flat';
}

/** KPI tile: a label, one amount and an optional trend. */
@Component({
  selector: 'pp-stat-card',
  imports: [AmountText, Badge],
  template: `
    <div class="glass flex flex-col gap-1 p-4">
      <span class="text-xs font-medium text-ink-muted">{{ label() }}</span>
      @if (money(); as amount) {
        <pp-amount-text [money]="amount" emphasis="md" class="!text-2xl" />
      } @else {
        <span class="text-2xl font-semibold text-ink-muted">&mdash;</span>
      }
      <div class="flex items-center gap-2">
        @if (trend(); as t) {
          <pp-badge [tone]="t.direction === 'flat' ? 'neutral' : t.direction" [text]="trendText(t)" />
        }
        @if (hint()) {
          <span class="text-xs text-ink-muted">{{ hint() }}</span>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class StatCard {
  readonly label = input.required<string>();
  readonly money = input<Money | null>(null);
  readonly trend = input<Trend>();
  readonly hint = input<string>();

  protected trendText(trend: Trend): string {
    const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '−' : '';
    return `${sign}${Math.abs(Math.round(trend.deltaPct))}%`;
  }
}
