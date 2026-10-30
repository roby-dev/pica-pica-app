import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AppHeader, GlassSurface } from '@pp/shared/ui';
import { ImportSmartSpend, type SmartSpendImportSummary } from '../../../application/import-smart-spend';

/** Backup screen. For now it hosts the Smart Spend import; export lands with the rest of WU-18. */
@Component({
  selector: 'pp-backup-page',
  imports: [AppHeader, GlassSurface],
  template: `
    <pp-app-header title="Respaldo" subtitle="Importar datos de otra app" />
    <pp-glass-surface class="flex flex-col gap-3 p-4">
      <h2 class="text-lg font-bold text-ink">Smart Spend</h2>
      <p class="text-sm text-ink-muted">
        Elige el archivo de respaldo (.json). Cada ítem con precio pasa a ser un gasto en la categoría Mercado,
        pagado en efectivo. Importar el mismo archivo dos veces no duplica nada.
      </p>
      <label
        class="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-pill bg-cta px-5 font-semibold text-on-cta"
      >
        {{ busy() ? 'Importando…' : 'Elegir archivo' }}
        <input class="sr-only" type="file" accept="application/json,.json" [disabled]="busy()" (change)="pick($event)" />
      </label>
      @if (summary(); as s) {
        <p class="text-sm text-ink" role="status">
          {{ s.imported }} gastos importados · {{ s.duplicates }} ya existían · {{ s.skipped }} sin precio
          @if (s.invalid > 0) {
            · {{ s.invalid }} inválidos
          }
        </p>
      }
      @if (error(); as message) {
        <p class="text-sm text-danger-text" role="alert">{{ message }}</p>
      }
    </pp-glass-surface>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPage {
  private readonly importer = inject(ImportSmartSpend);

  protected readonly busy = signal(false);
  protected readonly summary = signal<SmartSpendImportSummary | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async pick(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.summary.set(null);
    this.error.set(null);
    try {
      const result = await this.importer.run(await file.text());
      if (result.ok) this.summary.set(result.value);
      else this.error.set('Ese archivo no parece un respaldo de Smart Spend.');
    } catch {
      this.error.set('No se pudo leer el archivo. Intenta de nuevo.');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }
}
