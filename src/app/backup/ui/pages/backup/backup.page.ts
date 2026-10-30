import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AppHeader, GlassSurface } from '@pp/shared/ui';
import { BackupService, type RestoreSummary } from '../../../application/backup.service';
import { ImportSmartSpend, type SmartSpendImportSummary } from '../../../application/import-smart-spend';
import { deliverFile } from './deliver-file';

/** Export, restore and the Smart Spend import. */
@Component({
  selector: 'pp-backup-page',
  imports: [AppHeader, GlassSurface],
  template: `
    <pp-app-header title="Respaldo" subtitle="Exportar e importar" [showBack]="true" (back)="back()" />
    <div class="flex flex-col gap-4 pb-6">
      <pp-glass-surface class="flex flex-col gap-3 p-4">
        <h2 class="text-lg font-bold text-ink">Exportar mis datos</h2>
        <p class="text-sm text-ink-muted">
          Guarda un archivo con tus gastos, categorías y ajustes. Si borras la app o cambias de teléfono, lo
          restauras desde aquí.
        </p>
        <button
          type="button"
          class="inline-flex min-h-12 items-center justify-center rounded-pill bg-cta px-5 font-semibold text-on-cta disabled:opacity-50"
          [disabled]="busy()"
          (click)="exportAll()"
        >
          Exportar respaldo
        </button>
        @if (exported(); as message) {
          <p class="text-sm text-ink" role="status">{{ message }}</p>
        }
      </pp-glass-surface>

      <pp-glass-surface class="flex flex-col gap-3 p-4">
        <h2 class="text-lg font-bold text-ink">Restaurar respaldo</h2>
        <p class="text-sm text-ink-muted">
          Elige un respaldo de Pica-Pica (.json). Se suma a lo que ya tienes: no borra nada y los gastos que ya
          existen no se repiten.
        </p>
        <label
          class="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-pill bg-cta px-5 font-semibold text-on-cta"
        >
          Elegir archivo
          <input class="sr-only" type="file" accept="application/json,.json" [disabled]="busy()" (change)="restore($event)" />
        </label>
        @if (restored(); as s) {
          <p class="text-sm text-ink" role="status">
            {{ s.imported }} gastos restaurados · {{ s.duplicates }} ya existían
            @if (s.invalid > 0) {
              · {{ s.invalid }} inválidos
            }
          </p>
        }
        @if (restoreError(); as message) {
          <p class="text-sm text-danger-text" role="alert">{{ message }}</p>
        }
      </pp-glass-surface>

      <pp-glass-surface class="flex flex-col gap-3 p-4">
        <h2 class="text-lg font-bold text-ink">Importar de Smart Spend</h2>
        <p class="text-sm text-ink-muted">
          Cada ítem con precio pasa a ser un gasto en la categoría Mercado, pagado en efectivo. Importar el mismo
          archivo dos veces no duplica nada.
        </p>
        <label
          class="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-pill bg-cta px-5 font-semibold text-on-cta"
        >
          Elegir archivo
          <input class="sr-only" type="file" accept="application/json,.json" [disabled]="busy()" (change)="importSmartSpend($event)" />
        </label>
        @if (smartSpend(); as s) {
          <p class="text-sm text-ink" role="status">
            {{ s.imported }} gastos importados · {{ s.duplicates }} ya existían · {{ s.skipped }} sin precio
            @if (s.invalid > 0) {
              · {{ s.invalid }} inválidos
            }
          </p>
        }
        @if (smartSpendError(); as message) {
          <p class="text-sm text-danger-text" role="alert">{{ message }}</p>
        }
      </pp-glass-surface>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPage {
  private readonly backup = inject(BackupService);
  private readonly smartSpendImport = inject(ImportSmartSpend);

  protected readonly busy = signal(false);
  protected readonly exported = signal<string | null>(null);
  protected readonly restored = signal<RestoreSummary | null>(null);
  protected readonly restoreError = signal<string | null>(null);
  protected readonly smartSpend = signal<SmartSpendImportSummary | null>(null);
  protected readonly smartSpendError = signal<string | null>(null);

  protected back(): void {
    history.back();
  }

  protected async exportAll(): Promise<void> {
    this.busy.set(true);
    this.exported.set(null);
    try {
      const file = this.backup.createBackup();
      const day = file.exportedAt.slice(0, 10);
      const outcome = await deliverFile(`pica-pica-respaldo-${day}.json`, JSON.stringify(file), 'application/json');
      if (outcome !== 'cancelled') {
        await this.backup.markExported();
        this.exported.set(`${file.expenses.length} gastos exportados`);
      }
    } catch {
      this.exported.set('No se pudo exportar. Intenta de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async restore(event: Event): Promise<void> {
    await this.read(
      event,
      this.restored,
      this.restoreError,
      async (text) => {
        const result = await this.backup.restore(text);
        return result.ok ? result.value : null;
      },
      'Ese archivo no parece un respaldo de Pica-Pica.',
    );
  }

  protected async importSmartSpend(event: Event): Promise<void> {
    await this.read(
      event,
      this.smartSpend,
      this.smartSpendError,
      async (text) => {
        const result = await this.smartSpendImport.run(text);
        return result.ok ? result.value : null;
      },
      'Ese archivo no parece un respaldo de Smart Spend.',
    );
  }

  /** Reads the picked file, runs the import and reports either its summary or a readable error. */
  private async read<T>(
    event: Event,
    summary: { set(value: T | null): void },
    error: { set(value: string | null): void },
    run: (text: string) => Promise<T | null>,
    invalidMessage: string,
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    summary.set(null);
    error.set(null);
    try {
      const result = await run(await file.text());
      if (result) summary.set(result);
      else error.set(invalidMessage);
    } catch {
      error.set('No se pudo leer el archivo. Intenta de nuevo.');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }
}
