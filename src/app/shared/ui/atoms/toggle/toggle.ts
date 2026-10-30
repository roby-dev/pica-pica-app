import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** iOS-style switch; the whole row is the hit target. */
@Component({
  selector: 'pp-toggle',
  template: `
    <button
      type="button"
      role="switch"
      class="flex min-h-12 w-full items-center justify-between gap-4 text-left text-base text-ink disabled:opacity-50"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="checked.set(!checked())"
    >
      <span>{{ label() }}</span>
      <span
        class="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors"
        [class]="checked() ? 'bg-accent-strong' : 'bg-ink/20'"
        aria-hidden="true"
      >
        <span
          class="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-md transition-transform"
          [class.translate-x-5]="checked()"
        ></span>
      </span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Toggle {
  readonly label = input.required<string>();
  readonly disabled = input(false);

  readonly checked = model(false);
}
