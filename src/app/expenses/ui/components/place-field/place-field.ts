import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Chip, TextField } from '@pp/shared/ui';

/** Free-text place with chips for the places used most recently. */
@Component({
  selector: 'pp-place-field',
  imports: [Chip, TextField],
  template: `
    <div class="flex flex-col gap-2">
      <pp-text-field label="Dónde" placeholder="Ej. Bodega de la esquina" [maxLength]="80" [(value)]="value" />
      @if (suggestions().length > 0) {
        <div class="scroll-row">
          @for (place of suggestions(); track place) {
            <pp-chip [label]="place" [selected]="value() === place" (toggled)="value.set($event ? place : '')" />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PlaceField {
  readonly suggestions = input<readonly string[]>([]);
  readonly value = model('');
}
