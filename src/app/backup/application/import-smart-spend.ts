import { Injectable, inject } from '@angular/core';
import { CatalogStore, ExpensesStore, SEED_CATEGORIES, SEED_PAYMENT_METHODS, type ImportSummary } from '@pp/expenses';
import { err, ok, type DomainError, type Result } from '@pp/shared/kernel';
import { parseSmartSpend } from '../domain/smart-spend';

const MERCADO = SEED_CATEGORIES.find((c) => c.name === 'Mercado');
const CASH = SEED_PAYMENT_METHODS.find((m) => m.name === 'Efectivo');

export interface SmartSpendImportSummary extends ImportSummary {
  /** Items without a price in the source file. */
  readonly skipped: number;
}

/** Brings a Smart Spend backup in: every priced item becomes one cash expense in "Mercado". */
@Injectable({ providedIn: 'root' })
export class ImportSmartSpend {
  private readonly expenses = inject(ExpensesStore);
  private readonly catalog = inject(CatalogStore);

  async run(text: string): Promise<Result<SmartSpendImportSummary, DomainError>> {
    const parsed = parseSmartSpend(text);
    if (!parsed.ok) return parsed;
    if (!MERCADO || !CASH) throw new Error('Seed catalog is missing Mercado or Efectivo');

    const category = await this.catalog.ensureCategory(MERCADO);
    if (!category.ok) return err(category.error);

    const summary = await this.expenses.importMany(
      parsed.value.items.map((item) => ({
        id: item.id,
        what: item.what,
        amountMinor: item.amountMinor,
        categoryId: category.value.id,
        paymentMethodId: CASH.id,
        place: item.place,
        occurredAt: item.occurredAt,
      })),
    );
    return ok({ ...summary, skipped: parsed.value.skipped });
  }
}
