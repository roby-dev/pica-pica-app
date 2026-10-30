import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Chip } from '@pp/shared/ui';
import type { PaymentMethod } from '../../../domain/category';
import type { PaymentMethodId } from '../../../domain/ids';

/** Wrapping row of payment-method chips. Tapping the selected chip again clears the choice. */
@Component({
  selector: 'pp-method-picker',
  imports: [Chip],
  template: `
    <div class="flex flex-col gap-1.5">
      <span class="px-1 text-sm font-medium text-ink-muted" id="pp-method-label">Cómo pagaste</span>
      <div class="flex flex-wrap gap-2" role="group" aria-labelledby="pp-method-label">
        @for (method of methods(); track method.id) {
          <pp-chip
            [label]="method.name"
            [selected]="selectedId() === method.id"
            (toggled)="selectedId.set($event ? method.id : null)"
          />
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class MethodPicker {
  readonly methods = input.required<readonly PaymentMethod[]>();
  readonly selectedId = model<PaymentMethodId | null>(null);
}
