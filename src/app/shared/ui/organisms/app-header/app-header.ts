import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconButton } from '../../atoms/icon-button/icon-button';

/** Large iOS-style title with an optional back button. The page body already pads the safe area. */
@Component({
  selector: 'pp-app-header',
  imports: [IconButton],
  template: `
    <header class="flex items-center gap-3 px-1 pb-3 pt-4">
      @if (showBack()) {
        <pp-icon-button icon="chevron-left" label="Volver" (pressed)="back.emit()" />
      }
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-3xl font-extrabold tracking-tight text-ink">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="truncate text-sm text-ink-muted">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AppHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly showBack = input(false);

  readonly back = output<void>();
}
