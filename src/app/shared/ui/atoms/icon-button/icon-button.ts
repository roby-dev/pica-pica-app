import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type IconButtonVariant = 'ghost' | 'primary' | 'danger';

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  ghost: 'glass text-ink',
  primary: 'bg-accent text-ink',
  danger: 'bg-danger text-white',
};

/** Icon-only button. The label is required: it becomes the accessible name. */
@Component({
  selector: 'pp-icon-button',
  imports: [Icon],
  template: `
    <button type="button" [class]="classes()" [attr.aria-label]="label()" (click)="pressed.emit()">
      <pp-icon [name]="icon()" [size]="24" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly variant = input<IconButtonVariant>('ghost');

  readonly pressed = output<void>();

  protected readonly classes = computed(
    () =>
      `grid size-11 place-items-center rounded-pill transition active:scale-95 ${VARIANT_CLASS[this.variant()]}`,
  );
}
