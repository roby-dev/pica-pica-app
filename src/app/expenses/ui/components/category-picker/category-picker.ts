import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Chip } from '@pp/shared/ui';
import type { Category } from '../../../domain/category';
import type { CategoryId } from '../../../domain/ids';

/** Wrapping row of category chips. Tapping the selected chip again clears the choice. */
@Component({
  selector: 'pp-category-picker',
  imports: [Chip],
  template: `
    <div class="flex flex-col gap-1.5">
      <span class="px-1 text-sm font-medium text-ink-muted" id="pp-category-label">Categoría</span>
      <div class="flex flex-wrap gap-2" role="group" aria-labelledby="pp-category-label">
        @for (category of categories(); track category.id) {
          <pp-chip
            [label]="category.name"
            [emoji]="category.emoji"
            [color]="category.color"
            [selected]="selectedId() === category.id"
            (toggled)="selectedId.set($event ? category.id : null)"
          />
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class CategoryPicker {
  readonly categories = input.required<readonly Category[]>();
  readonly selectedId = model<CategoryId | null>(null);
}
