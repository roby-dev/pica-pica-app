import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon, IconButton } from '@pp/shared/ui';

/** "Add to Home Screen" reminder for iOS, where the browser will not offer it. */
@Component({
  selector: 'pp-install-hint',
  imports: [Icon, IconButton],
  template: `
    @if (visible()) {
      <aside class="glass flex items-center gap-3 py-2 pl-4 pr-2" role="note">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent" aria-hidden="true">
          <pp-icon name="share" [size]="20" />
        </span>
        <p class="min-w-0 flex-1 text-sm text-ink">
          <span class="font-semibold">Instala Pica-Pica.</span>
          Toca <span class="font-semibold">Compartir</span> y luego
          <span class="font-semibold">Agregar a inicio</span>.
        </p>
        <pp-icon-button icon="close" label="Cerrar aviso de instalación" (pressed)="dismissed.emit()" />
      </aside>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class InstallHint {
  readonly visible = input(false);

  readonly dismissed = output<void>();
}
