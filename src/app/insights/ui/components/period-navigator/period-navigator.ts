import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconButton } from '@pp/shared/ui';

/** "‹ octubre 2026 ›". The forward arrow disappears at the current period instead of leading nowhere. */
@Component({
  selector: 'pp-period-navigator',
  imports: [IconButton],
  template: `
    <div class="flex items-center justify-between gap-2">
      <pp-icon-button icon="chevron-left" label="Período anterior" (pressed)="prev.emit()" />
      <span class="min-w-0 truncate text-center text-base font-semibold capitalize text-ink" aria-live="polite">{{
        label()
      }}</span>
      @if (canGoNext()) {
        <pp-icon-button icon="chevron-right" label="Período siguiente" (pressed)="next.emit()" />
      } @else {
        <span class="size-11" aria-hidden="true"></span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PeriodNavigator {
  readonly label = input.required<string>();
  readonly canGoNext = input(false);

  readonly prev = output<void>();
  readonly next = output<void>();
}
