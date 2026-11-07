import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { Category } from '../../../domain/category';
import type { CategoryId } from '../../../domain/ids';

/** Grid of category tiles, all visible at once. Tapping the selected tile again clears the choice. */
@Component({
  selector: 'pp-category-picker',
  template: `
    <div class="flex flex-col gap-1.5">
      <span class="px-1 text-sm font-medium text-ink-muted" id="pp-category-label">Categoría</span>
      <div class="grid grid-cols-3 gap-2" role="group" aria-labelledby="pp-category-label">
        @for (category of categories(); track category.id) {
          <button
            type="button"
            class="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border-[0.5px] px-1 py-2 text-[13px] leading-tight text-ink transition active:scale-95"
            [class]="
              selectedId() === category.id
                ? 'border-transparent font-semibold ring-[1.5px] ring-ink'
                : 'border-chip-border bg-chip font-medium'
            "
            [style.background-color]="selectedId() === category.id ? tint(category.color) : null"
            [attr.aria-pressed]="selectedId() === category.id"
            (click)="selectedId.set(selectedId() === category.id ? null : category.id)"
          >
            <span class="size-2.5 rounded-full" [style.background-color]="category.color" aria-hidden="true"></span>
            <span class="max-w-full truncate">{{ category.name }}</span>
          </button>
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

  /** A soft wash of the category color, so the tile reads as chosen without turning solid. */
  protected tint(color: string): string {
    return `color-mix(in oklch, ${color} 38%, transparent)`;
  }
}
