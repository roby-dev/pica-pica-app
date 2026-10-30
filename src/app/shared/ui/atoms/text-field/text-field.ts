import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

type InputMode = 'text' | 'search' | 'decimal' | 'numeric' | 'email';

/** Glass text input. 16px type or larger so iOS never zooms the page on focus. */
@Component({
  selector: 'pp-text-field',
  template: `
    <label class="flex flex-col gap-1.5" [attr.for]="inputId">
      <span class="px-1 text-sm font-medium text-ink-muted">{{ label() }}</span>
      <input
        [id]="inputId"
        type="text"
        class="glass min-h-12 w-full px-4 text-base text-ink outline-none placeholder:text-ink/35 focus-visible:ring-2 focus-visible:ring-accent-strong"
        [class.ring-2]="!!error()"
        [class.ring-danger]="!!error()"
        [placeholder]="placeholder()"
        [attr.maxlength]="maxLength()"
        [attr.inputmode]="inputmode()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-invalid]="!!error()"
        [attr.aria-describedby]="error() ? inputId + '-error' : null"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
        (blur)="blurred.emit()"
      />
      @if (error()) {
        <span class="px-1 text-sm text-danger-text" [id]="inputId + '-error'" role="alert">
          {{ error() }}
        </span>
      }
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TextField {
  private static nextId = 0;

  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly maxLength = input<number>();
  readonly error = input<string | null>(null);
  readonly inputmode = input<InputMode>('text');
  readonly autocomplete = input('off');

  readonly value = model('');
  readonly blurred = output<void>();

  protected readonly inputId = `pp-text-${TextField.nextId++}`;
}
