import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../atoms/button/button';
import { Icon, type IconName } from '../../atoms/icon/icon';

@Component({
  selector: 'pp-empty-state',
  imports: [Icon, Button],
  template: `
    <div class="glass flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span class="grid size-14 place-items-center rounded-full bg-white/60 text-ink-muted">
        <pp-icon [name]="icon()" [size]="28" />
      </span>
      <h2 class="text-lg font-bold text-ink">{{ title() }}</h2>
      <p class="max-w-xs text-sm text-ink-muted">{{ message() }}</p>
      @if (actionLabel()) {
        <pp-button (pressed)="action.emit()">{{ actionLabel() }}</pp-button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();

  readonly action = output<void>();
}
