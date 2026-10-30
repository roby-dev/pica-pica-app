import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Money } from '@pp/shared/kernel';
import { AmountText, Badge, IconButton } from '@pp/shared/ui';

/** Everything a row shows, already formatted by the page so the component stays dumb. */
export interface ExpenseRowVm {
  readonly id: string;
  readonly what: string;
  readonly money: Money;
  readonly categoryName: string;
  /** Any CSS color; drawn as the ring around the category initial. */
  readonly categoryColor: string;
  readonly place: string | null;
  readonly methodName: string;
  readonly timeLabel: string;
  readonly isAnt: boolean;
}

@Component({
  selector: 'pp-expense-row',
  imports: [AmountText, Badge, IconButton],
  template: `
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-2 text-left active:bg-ink/10"
        [attr.aria-label]="'Editar ' + row().what"
        (click)="opened.emit(row().id)"
      >
        <span
          class="grid size-11 shrink-0 place-items-center rounded-full border-2 bg-chip text-base font-bold uppercase text-ink"
          [style.border-color]="row().categoryColor"
          aria-hidden="true"
          >{{ initial() }}</span
        >
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-base font-semibold text-ink">{{ row().what }}</span>
          <span class="truncate text-sm text-ink-muted">{{ details() }}</span>
        </span>
        <span class="flex flex-col items-end gap-1">
          <pp-amount-text [money]="row().money" [signed]="true" emphasis="md" />
          @if (row().isAnt) {
            <pp-badge tone="neutral" text="Hormiga" />
          }
        </span>
      </button>
      <pp-icon-button icon="trash" [label]="'Eliminar ' + row().what" (pressed)="deleteRequested.emit(row().id)" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ExpenseRow {
  readonly row = input.required<ExpenseRowVm>();

  readonly opened = output<string>();
  readonly deleteRequested = output<string>();

  protected details(): string {
    const { timeLabel, categoryName, place, methodName } = this.row();
    return [timeLabel, categoryName, place, methodName].filter(Boolean).join(' · ');
  }

  protected initial(): string {
    return this.row().categoryName.trim().charAt(0) || '·';
  }
}
