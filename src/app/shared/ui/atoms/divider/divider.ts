import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** 0.5px hairline. */
@Component({
  selector: 'pp-divider',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    class: 'block h-[0.5px] bg-ink/15',
    '[class.mx-4]': 'inset()',
  },
})
export class Divider {
  readonly inset = input(false);
}
