import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Selectable pill. Min 44px tall so it is easy to hit with a thumb. */
@Component({
  selector: 'pp-chip',
  template: `
    <button
      type="button"
      class="inline-flex min-h-11 items-center gap-1.5 rounded-pill border-[0.5px] px-4 text-[15px] font-medium transition active:scale-95"
      [class]="selected() ? 'border-transparent bg-accent font-semibold text-on-accent' : 'border-chip-border bg-chip text-ink'"
      [style.background-color]="selected() && color() ? color() : null"
      [attr.aria-pressed]="selected()"
      (click)="toggled.emit(!selected())"
    >
      @if (emoji()) {
        <span aria-hidden="true">{{ emoji() }}</span>
      }
      {{ label() }}
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
})
export class Chip {
  readonly label = input.required<string>();
  readonly emoji = input<string>();
  /** Any CSS color, applied as the background while selected. */
  readonly color = input<string>();
  readonly selected = input(false);

  readonly toggled = output<boolean>();
}
