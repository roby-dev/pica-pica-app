import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';

/** Glass toast. Dismisses itself after `durationMs`; the action (e.g. "Deshacer") dismisses it too. */
@Component({
  selector: 'pp-toast',
  template: `
    <div class="glass-strong flex items-center gap-3 py-2 pl-4 pr-2 text-sm font-medium text-ink" role="status">
      <span class="flex-1">{{ message() }}</span>
      @if (actionLabel()) {
        <button
          type="button"
          class="min-h-11 rounded-full px-4 font-semibold text-[oklch(0.45_0.12_262)] active:bg-white/50"
          (click)="action.emit()"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Toast {
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();
  readonly durationMs = input(5000);

  readonly action = output<void>();
  readonly dismissed = output<void>();

  constructor() {
    effect((onCleanup) => {
      // Reads message too, so a replacement toast restarts the countdown.
      this.message();
      const timer = setTimeout(() => this.dismissed.emit(), this.durationMs());
      onCleanup(() => clearTimeout(timer));
    });
  }
}
