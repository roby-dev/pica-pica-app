import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { toIsoWithOffset } from '@pp/shared/kernel';

const pad = (n: number) => String(n).padStart(2, '0');

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time. */
const toLocalInput = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Native date-time picker (best on iOS) plus "Ahora" and "Ayer" shortcuts. The value is ISO with offset. */
@Component({
  selector: 'pp-date-time-field',
  template: `
    <div class="flex flex-col gap-1.5">
      <label class="px-1 text-sm font-medium text-ink-muted" [attr.for]="inputId">{{ label() }}</label>
      <div class="flex items-center gap-2">
        <input
          [id]="inputId"
          type="datetime-local"
          class="glass min-h-12 min-w-0 flex-1 px-4 text-base text-ink outline-none"
          [value]="localValue()"
          [attr.max]="maxLocal()"
          (change)="onPick($any($event.target).value)"
        />
        <button type="button" class="glass min-h-12 px-4 text-sm font-semibold text-ink active:scale-95" (click)="setOffsetDays(0)">
          Ahora
        </button>
        <button type="button" class="glass min-h-12 px-4 text-sm font-semibold text-ink active:scale-95" (click)="setOffsetDays(-1)">
          Ayer
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DateTimeField {
  private static nextId = 0;

  readonly label = input('Cuándo');
  /** Latest selectable moment, ISO with offset. */
  readonly max = input<string>();
  readonly value = model('');

  protected readonly inputId = `pp-datetime-${DateTimeField.nextId++}`;
  protected readonly localValue = computed(() => toLocalInput(this.value()));
  protected readonly maxLocal = computed(() => {
    const max = this.max();
    return max ? toLocalInput(max) : null;
  });

  protected onPick(local: string): void {
    const date = new Date(local);
    if (!Number.isNaN(date.getTime())) this.value.set(toIsoWithOffset(date));
  }

  protected setOffsetDays(days: number): void {
    const date = new Date();
    date.setDate(date.getDate() + days);
    this.value.set(toIsoWithOffset(date));
  }
}
