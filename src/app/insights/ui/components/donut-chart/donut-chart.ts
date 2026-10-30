import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface DonutSlice {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Any CSS color. */
  readonly color: string;
  /** Pre-formatted amount shown in the legend. */
  readonly valueText: string;
}

interface Arc {
  readonly slice: DonutSlice;
  /** Whole percent, for the legend. */
  readonly percent: number;
  /** Exact length of the drawn arc, out of a ring of 100. */
  readonly length: number;
  readonly offset: number;
}

/** Circumference of the ring is exactly 100 (r = 100 / 2π), so a slice's length is its percentage. */
const RADIUS = 15.9155;
const GAP = 0.6;

@Component({
  selector: 'pp-donut-chart',
  template: `
    <div class="flex flex-col gap-4">
      <div class="relative mx-auto size-44">
        <svg viewBox="0 0 42 42" class="size-full -rotate-90" role="img" [attr.aria-label]="ariaLabel()">
          <circle cx="21" cy="21" [attr.r]="radius" fill="none" stroke-width="5" class="stroke-ink/10" />
          @for (arc of arcs(); track arc.slice.key) {
            <circle
              cx="21"
              cy="21"
              [attr.r]="radius"
              fill="none"
              stroke-width="5"
              stroke-linecap="butt"
              class="transition-opacity"
              [attr.stroke]="arc.slice.color"
              [attr.stroke-dasharray]="arc.length + ' ' + (100 - arc.length)"
              [attr.stroke-dashoffset]="arc.offset"
              [attr.opacity]="selectedKey() && selectedKey() !== arc.slice.key ? 0.3 : 1"
            />
          }
        </svg>
        <div class="absolute inset-0 grid place-items-center text-center">
          <span class="flex flex-col px-6 text-sm font-semibold text-ink">
            @if (selected(); as arc) {
              <span class="truncate">{{ arc.slice.label }}</span>
              <span class="text-ink-muted">{{ arc.slice.valueText }}</span>
            } @else {
              {{ centerLabel() }}
            }
          </span>
        </div>
      </div>

      <ul class="flex flex-col gap-1">
        @for (arc of arcs(); track arc.slice.key) {
          <li>
            <button
              type="button"
              class="flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 text-left transition active:bg-ink/10"
              [class.bg-ink/10]="selectedKey() === arc.slice.key"
              [attr.aria-pressed]="selectedKey() === arc.slice.key"
              (click)="select(arc.slice.key)"
            >
              <span class="size-3 shrink-0 rounded-full" [style.background-color]="arc.slice.color" aria-hidden="true"></span>
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {{ arc.slice.label }}
              </span>
              <span class="text-sm tabular-nums text-ink-muted">{{ arc.slice.valueText }}</span>
              <span class="w-10 text-right text-sm font-semibold tabular-nums text-ink">{{ arc.percent }}%</span>
            </button>
          </li>
        }
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DonutChart {
  readonly slices = input.required<readonly DonutSlice[]>();
  /** Shown in the middle when nothing is selected, for example "Total S/ 120.00". */
  readonly centerLabel = input('');
  readonly ariaLabel = input('Gasto por categoría');

  readonly selectedKey = model<string | null>(null);

  protected readonly radius = RADIUS;

  protected readonly arcs = computed<readonly Arc[]>(() => {
    const slices = this.slices().filter((s) => s.value > 0);
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    let covered = 0;
    return slices.map((slice) => {
      const exact = (slice.value / total) * 100;
      // A hairline gap between slices keeps neighbours readable; a lone slice stays a full ring.
      const length = slices.length > 1 ? Math.max(exact - GAP, 0.1) : exact;
      const arc = { slice, percent: Math.round(exact), length, offset: -covered };
      covered += exact;
      return arc;
    });
  });

  protected readonly selected = computed(() => this.arcs().find((a) => a.slice.key === this.selectedKey()) ?? null);

  protected select(key: string): void {
    this.selectedKey.set(this.selectedKey() === key ? null : key);
  }
}
