import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Skeleton } from '@pp/shared/ui';
import { DayGroup, type DayGroupVm } from '../day-group/day-group';

/** Expenses grouped by day, with a skeleton while storage is still loading. */
@Component({
  selector: 'pp-expense-list',
  imports: [DayGroup, Skeleton],
  template: `
    @if (loading()) {
      <div class="flex flex-col gap-3" aria-busy="true">
        <pp-skeleton shape="rect" />
        <pp-skeleton shape="rect" />
      </div>
    } @else {
      <div class="flex flex-col gap-5">
        @for (group of groups(); track group.dayKey) {
          <pp-day-group [group]="group" (opened)="opened.emit($event)" (deleteRequested)="deleteRequested.emit($event)" />
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ExpenseList {
  readonly groups = input.required<readonly DayGroupVm[]>();
  readonly loading = input(false);

  readonly opened = output<string>();
  readonly deleteRequested = output<string>();
}
