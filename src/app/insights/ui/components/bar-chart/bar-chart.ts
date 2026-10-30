import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface BarPoint {
  readonly key: string;
  /** Full name, shown when the bar is selected ("lunes 26 oct"). */
  readonly label: string;
  /** Short text under the axis ("26"). Bars without one stay unlabeled. */
  readonly tick?: string;
  readonly value: number;
}

/**
 * Bars you can tap. Plain buttons on a flex row: every bar is a real, focusable target and the
 * browser handles the layout, so there is no SVG geometry to maintain.
 */
@Component({
  selector: 'pp-bar-chart',
  template: `
    <div class="flex flex-col gap-2">
      <p class="min-h-5 px-1 text-sm text-ink-muted" aria-live="polite">
        @if (active(); as bar) {
          <span class="font-semibold capitalize text-ink">{{ bar.label }}</span> · {{ formatValue()(bar.value) }}
        } @else {
          Toca una barra para ver el detalle
        }
      </p>
      <div class="flex h-36 items-end gap-[3px]" role="group" [attr.aria-label]="ariaLabel()">
        @for (bar of series(); track bar.key) {
          <button
            type="button"
            class="group flex h-full min-w-0 flex-1 items-end"
            [attr.aria-label]="bar.label + ': ' + formatValue()(bar.value)"
            [attr.aria-pressed]="bar.key === selectedKey()"
            (click)="select(bar.key)"
          >
            <span
              class="block w-full rounded-t-[5px] transition-[height,background-color] duration-300"
              [class]="bar.key === selectedKey() || bar.key === highlightKey() ? 'bg-accent' : 'bg-ink/25'"
              [style.height.%]="heightOf(bar.value)"
            ></span>
          </button>
        }
      </div>
      <div class="flex gap-[3px]" aria-hidden="true">
        @for (bar of series(); track bar.key) {
          <span class="min-w-0 flex-1 text-center text-[10px] text-ink-muted">{{ bar.tick ?? '' }}</span>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class BarChart {
  readonly series = input.required<readonly BarPoint[]>();
  readonly formatValue = input<(value: number) => string>((value) => String(value));
  /** Drawn in the accent color without being selected, for example today. */
  readonly highlightKey = input<string>();
  readonly ariaLabel = input('Gasto por período');

  readonly selectedKey = model<string | null>(null);

  private readonly max = computed(() => Math.max(0, ...this.series().map((b) => b.value)));

  protected readonly active = computed(() => this.series().find((b) => b.key === this.selectedKey()) ?? null);

  /** Empty bars keep a sliver so the row reads as a chart rather than a gap. */
  protected heightOf(value: number): number {
    const max = this.max();
    return max === 0 ? 2 : Math.max(2, (value / max) * 100);
  }

  protected select(key: string): void {
    this.selectedKey.set(this.selectedKey() === key ? null : key);
  }
}
