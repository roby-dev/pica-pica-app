import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppHeader, Button, TextField, ToastService, Toggle } from '@pp/shared/ui';
import { CatalogStore } from '../../../application/catalog.store';

interface Item {
  readonly id: string;
  readonly name: string;
  readonly archived: boolean;
}

type Kind = 'category' | 'method';

/** Rename and archive categories and payment methods. Archived items stay valid on old expenses. */
@Component({
  selector: 'pp-catalog-page',
  imports: [AppHeader, Button, TextField, Toggle],
  template: `
    <pp-app-header title="Categorías y métodos" subtitle="Renombra u oculta" [showBack]="true" (back)="back()" />
    <div class="flex flex-col gap-5 pb-6">
      @for (section of sections(); track section.kind) {
        <section class="flex flex-col gap-2" [attr.aria-label]="section.title">
          <h2 class="px-1 text-sm font-semibold text-ink-muted">{{ section.title }}</h2>
          <div class="glass flex flex-col divide-y divide-[var(--glass-border)] px-3">
            @for (item of section.items; track item.id) {
              <div class="flex flex-col gap-2 py-2">
                @if (editing() === item.id) {
                  <pp-text-field label="Nombre" [maxLength]="24" [error]="error()" [(value)]="draft" />
                  <div class="flex gap-2">
                    <pp-button variant="ghost" (pressed)="cancel()">Cancelar</pp-button>
                    <pp-button (pressed)="save(section.kind, item.id)">Guardar</pp-button>
                  </div>
                } @else {
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="min-h-12 min-w-0 flex-1 truncate text-left text-base font-semibold text-ink"
                      [class.opacity-50]="item.archived"
                      [attr.aria-label]="'Renombrar ' + item.name"
                      (click)="edit(item)"
                    >
                      {{ item.name }}
                    </button>
                    <div class="w-40 shrink-0">
                      <pp-toggle
                        label="Visible"
                        [checked]="!item.archived"
                        (checkedChange)="setVisible(section.kind, item.id, $event)"
                      />
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  private readonly catalog = inject(CatalogStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly sections = computed<readonly { kind: Kind; title: string; items: readonly Item[] }[]>(() => [
    { kind: 'category', title: 'Categorías', items: this.catalog.categories() },
    { kind: 'method', title: 'Métodos de pago', items: this.catalog.methods() },
  ]);

  protected edit(item: Item): void {
    this.editing.set(item.id);
    this.draft.set(item.name);
    this.error.set(null);
  }

  protected cancel(): void {
    this.editing.set(null);
  }

  protected async save(kind: Kind, id: string): Promise<void> {
    const result =
      kind === 'category'
        ? await this.catalog.renameCategory(id as never, this.draft())
        : await this.catalog.renameMethod(id as never, this.draft());
    if (result.ok) this.editing.set(null);
    else this.error.set(result.error.message === 'That name is already in use' ? 'Ese nombre ya existe' : 'Usa de 1 a 24 caracteres');
  }

  protected async setVisible(kind: Kind, id: string, visible: boolean): Promise<void> {
    const result =
      kind === 'category'
        ? await this.catalog.setCategoryArchived(id as never, !visible)
        : await this.catalog.setMethodArchived(id as never, !visible);
    if (!result.ok) this.toast.show({ message: 'No se pudo guardar el cambio' });
  }

  protected back(): void {
    void this.router.navigateByUrl('/settings');
  }
}
