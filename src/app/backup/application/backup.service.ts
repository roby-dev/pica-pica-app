import { Injectable, inject } from '@angular/core';
import { CatalogStore, ExpensesStore, type ImportSummary } from '@pp/expenses';
import { SettingsStore } from '@pp/settings';
import { CLOCK } from '@pp/shared/di';
import { err, ok, parseCurrency, toIsoWithOffset, type DomainError, type Result } from '@pp/shared/kernel';
import { buildBackup, parseBackup, type BackupFile } from './backup-file';

export interface RestoreSummary extends ImportSummary {
  readonly categories: number;
  readonly methods: number;
}

/** Exports everything the user created and merges a backup back in. Restoring never deletes or overwrites expenses. */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly expenses = inject(ExpensesStore);
  private readonly catalog = inject(CatalogStore);
  private readonly settings = inject(SettingsStore);
  private readonly clock = inject(CLOCK);

  createBackup(): BackupFile {
    const { theme, defaultCurrency, antExpenseThreshold } = this.settings.settings();
    return buildBackup({
      exportedAt: toIsoWithOffset(this.clock.now()),
      settings: { theme, defaultCurrency, antThresholdMinor: antExpenseThreshold.amountMinor },
      categories: this.catalog.categories(),
      methods: this.catalog.methods(),
      expenses: this.expenses.all(),
    });
  }

  /** Call once the file has actually been handed to the user, so "last backup" is truthful. */
  async markExported(): Promise<void> {
    await this.settings.update({ lastBackupAt: this.clock.now().toISOString() });
  }

  async restore(text: string): Promise<Result<RestoreSummary, DomainError>> {
    const parsed = parseBackup(text);
    if (!parsed.ok) return parsed;
    const file = parsed.value;

    let categories = 0;
    for (const category of file.categories) {
      const had = this.catalog.categoryById().has(category.id);
      const added = await this.catalog.ensureCategory(category);
      if (!added.ok) return err(added.error);
      if (!had) categories++;
    }
    let methods = 0;
    for (const method of file.methods) {
      const had = this.catalog.methodById().has(method.id);
      const added = await this.catalog.ensureMethod(method);
      if (!added.ok) return err(added.error);
      if (!had) methods++;
    }

    const summary = await this.expenses.importMany(
      file.expenses.map((e) => ({
        id: e.id,
        what: e.what,
        amountMinor: e.amount.amountMinor,
        currency: e.amount.currency,
        categoryId: e.categoryId,
        paymentMethodId: e.paymentMethodId,
        place: e.place,
        occurredAt: e.occurredAt,
        note: e.note,
      })),
    );

    const currency = parseCurrency(file.settings.defaultCurrency);
    if (currency.ok) {
      await this.settings.update({
        theme: file.settings.theme,
        defaultCurrency: currency.value,
        antExpenseThreshold: { amountMinor: file.settings.antThresholdMinor, currency: currency.value },
      });
    }
    return ok({ ...summary, categories, methods });
  }
}
