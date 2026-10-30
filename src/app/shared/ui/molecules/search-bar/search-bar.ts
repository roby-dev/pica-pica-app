import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

/** Search input. Debouncing belongs to the container that reacts to `query`. */
@Component({
  selector: 'pp-search-bar',
  imports: [Icon],
  template: `
    <label class="glass flex min-h-12 items-center gap-2 px-4 !rounded-full">
      <pp-icon name="search" [size]="20" class="text-ink-muted" />
      <input
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        autocorrect="off"
        class="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/35"
        [placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
      @if (query()) {
        <button
          type="button"
          class="grid size-8 place-items-center rounded-full text-ink-muted active:bg-ink/10"
          aria-label="Borrar búsqueda"
          (click)="query.set('')"
        >
          <pp-icon name="close" [size]="16" />
        </button>
      }
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SearchBar {
  readonly placeholder = input('Buscar');
  readonly query = model('');
}
