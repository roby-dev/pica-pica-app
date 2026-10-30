import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentOption {
  readonly value: string;
  readonly label: string;
}

/** Pill switcher for 2-4 options (week / month / year). Each segment is at least 40px tall. */
@Component({
  selector: 'pp-segmented-control',
  template: `
    <div role="radiogroup" class="glass flex gap-1 p-1 !rounded-full">
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          class="min-h-10 flex-1 rounded-full px-3 text-sm font-semibold transition"
          [class]="option.value === value() ? 'bg-white/90 text-ink shadow-sm' : 'text-ink-muted'"
          [attr.aria-checked]="option.value === value()"
          (click)="value.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SegmentedControl {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = model<string>('');
}
