import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'up' | 'down' | 'neutral';

const TONE_CLASS: Record<BadgeTone, string> = {
  up: 'bg-[oklch(0.9_0.06_20)] text-[oklch(0.42_0.12_20)]',
  down: 'bg-[oklch(0.91_0.06_165)] text-[oklch(0.4_0.08_165)]',
  neutral: 'bg-ink/10 text-ink-muted',
};

/** Trend or status pill. `up` means spending went up (reads as caution), `down` as relief. */
@Component({
  selector: 'pp-badge',
  template: '{{ text() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
  readonly text = input.required<string>();

  protected readonly classes = computed(
    () =>
      `inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[this.tone()]}`,
  );
}
