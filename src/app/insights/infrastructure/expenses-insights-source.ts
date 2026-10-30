import { Injectable, computed, inject } from '@angular/core';
import { CatalogStore, ExpensesStore, localDayKey } from '@pp/expenses';
import type { SpendRecord } from '../domain/expense-analytics';
import type { InsightsSource, LabelInfo } from '../application/ports/insights-source';

/** Anti-corruption layer: reads the expenses feature and speaks insights' own language. */
@Injectable()
export class ExpensesInsightsSource implements InsightsSource {
  private readonly expenses = inject(ExpensesStore);
  private readonly catalog = inject(CatalogStore);

  readonly records = computed<readonly SpendRecord[]>(() =>
    this.expenses.all().map((e) => ({
      id: e.id,
      what: e.what,
      amount: e.amount,
      categoryId: e.categoryId,
      paymentMethodId: e.paymentMethodId,
      place: e.place,
      day: localDayKey(e.occurredAt),
    })),
  );

  readonly loading = computed(() => this.expenses.isLoading());
  readonly threshold = this.expenses.antThreshold;
  readonly defaultCurrency = this.expenses.defaultCurrency;

  readonly categories = computed<ReadonlyMap<string, LabelInfo>>(
    () => new Map(this.catalog.categories().map((c) => [c.id, { name: c.name, emoji: c.emoji, color: c.color }])),
  );

  readonly methods = computed<ReadonlyMap<string, LabelInfo>>(
    () => new Map(this.catalog.methods().map((m) => [m.id, { name: m.name }])),
  );
}
