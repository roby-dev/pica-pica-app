import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-cta text-on-cta shadow-[0_10px_22px_-12px_var(--color-accent-strong)]',
  ghost: 'glass text-ink',
  danger: 'bg-danger text-white',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

/** Pill button. Targets are at least 48px tall, above the 44px iOS minimum. */
@Component({
  selector: 'pp-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading()"
      [class]="classes()"
      (click)="onClick()"
    >
      @if (loading()) {
        <span
          class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden="true"
        ></span>
      }
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', '[class.w-full]': 'block()' },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  /** Stretches to the full width of the container, the default thumb-friendly layout. */
  readonly block = input(false);

  readonly pressed = output<void>();

  protected readonly classes = computed(
    () =>
      `inline-flex w-full items-center justify-center gap-2 rounded-pill font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASS[this.variant()]} ${SIZE_CLASS[this.size()]}`,
  );

  protected onClick(): void {
    if (!this.disabled() && !this.loading()) this.pressed.emit();
  }
}
