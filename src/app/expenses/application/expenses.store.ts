import { Injectable, computed, inject, resource, signal } from '@angular/core';
import { SettingsStore } from '@pp/settings';
import { CLOCK, ID_GENERATOR } from '@pp/shared/di';
import {
  addTo,
  emptyTotals,
  err,
  ok,
  type CurrencyTotals,
  type DomainError,
  type Result,
} from '@pp/shared/kernel';
import { restoreExpense, softDeleteExpense, type Expense } from '../domain/expense';
import { ExpenseNotFoundError, ExpensePersistenceError } from '../domain/expense.errors';
import type { ExpenseId } from '../domain/ids';
import { isoWeekKey, localDayKey, toOccurredAt } from '../domain/occurred-at';
import { CatalogStore } from './catalog.store';
import { EXPENSE_REPOSITORY } from './ports/expense.repository';
import { addExpense, type ExpenseCommand } from './use-cases/add-expense';
import { editExpense } from './use-cases/update-expense';

const RECENT_LIMIT = 8;

@Injectable({ providedIn: 'root' })
export class ExpensesStore {
  private readonly repository = inject(EXPENSE_REPOSITORY);
  private readonly catalog = inject(CatalogStore);
  private readonly settings = inject(SettingsStore);
  private readonly clock = inject(CLOCK);
  private readonly ids = inject(ID_GENERATOR);

  private readonly loaded = resource<readonly Expense[], void>({
    loader: () => this.repository.list(),
  });

  private readonly _lastDeleted = signal<Expense | null>(null);

  /** Active expenses, newest first. */
  readonly all = computed(() => this.loaded.value() ?? []);
  readonly isLoading = computed(() => this.loaded.isLoading());
  readonly error = computed(() => this.loaded.error());

  /** The most recently deleted expense, kept so the UI can offer "Deshacer". */
  readonly lastDeleted = this._lastDeleted.asReadonly();

  readonly recentWhats = computed(() => recent(this.all(), (e) => e.what));
  readonly recentPlaces = computed(() => recent(this.all(), (e) => e.place));

  /** Per-currency totals; currencies are never added together. */
  readonly todayTotals = computed(() => {
    const today = localDayKey(toOccurredAt(this.clock.now()));
    return sumBy(this.all(), (e) => localDayKey(e.occurredAt) === today);
  });

  readonly weekTotals = computed(() => {
    const week = isoWeekKey(toOccurredAt(this.clock.now()));
    return sumBy(this.all(), (e) => isoWeekKey(e.occurredAt) === week);
  });

  getById(id: ExpenseId): Expense | undefined {
    return this.all().find((e) => e.id === id);
  }

  async add(command: ExpenseCommand): Promise<Result<Expense, DomainError>> {
    const built = addExpense(command, {
      id: this.ids.next(),
      now: this.clock.now(),
      defaultCurrency: this.settings.defaultCurrency(),
      catalog: this.catalog.snapshot(),
    });
    if (!built.ok) return built;
    const expense = built.value;
    return this.commit([expense, ...this.all()], () => this.repository.save(expense), expense);
  }

  async update(id: ExpenseId, command: ExpenseCommand): Promise<Result<Expense, DomainError>> {
    const existing = this.getById(id);
    if (!existing) return err(new ExpenseNotFoundError(id));
    const built = editExpense(existing, command, {
      now: this.clock.now(),
      defaultCurrency: this.settings.defaultCurrency(),
      catalog: this.catalog.snapshot(),
    });
    if (!built.ok) return built;
    const expense = built.value;
    return this.commit(
      this.all().map((e) => (e.id === id ? expense : e)),
      () => this.repository.save(expense),
      expense,
    );
  }

  async remove(id: ExpenseId): Promise<Result<Expense, DomainError>> {
    const existing = this.getById(id);
    if (!existing) return err(new ExpenseNotFoundError(id));
    const now = this.clock.now();
    const deleted = softDeleteExpense(existing, now);
    const result = await this.commit(
      this.all().filter((e) => e.id !== id),
      () => this.repository.softDelete(id, deleted.deletedAt as string),
      deleted,
    );
    if (result.ok) this._lastDeleted.set(existing);
    return result;
  }

  /** Brings back the last deleted expense, if any. */
  async undoRemove(): Promise<Result<Expense, DomainError>> {
    const target = this._lastDeleted();
    if (!target) return err(new ExpenseNotFoundError('last-deleted'));
    const restored = restoreExpense(target, this.clock.now());
    const result = await this.commit(
      [...this.all(), restored].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
      () => this.repository.restore(target.id, restored.updatedAt),
      restored,
    );
    if (result.ok) this._lastDeleted.set(null);
    return result;
  }

  dismissUndo(): void {
    this._lastDeleted.set(null);
  }

  /** Shows the change immediately and rolls it back if storage refuses it. */
  private async commit<T>(
    next: readonly Expense[],
    persist: () => Promise<void>,
    value: T,
  ): Promise<Result<T, DomainError>> {
    const previous = this.all();
    this.loaded.set(next);
    try {
      await persist();
      return ok(value);
    } catch {
      this.loaded.set(previous);
      return err(new ExpensePersistenceError());
    }
  }
}

/** Distinct non-empty values in order of most recent use. */
function recent(expenses: readonly Expense[], pick: (e: Expense) => string | null): readonly string[] {
  const seen = new Set<string>();
  for (const expense of expenses) {
    const value = pick(expense);
    if (value) seen.add(value);
    if (seen.size === RECENT_LIMIT) break;
  }
  return [...seen];
}

function sumBy(expenses: readonly Expense[], include: (e: Expense) => boolean): CurrencyTotals {
  return expenses.filter(include).reduce((totals, e) => addTo(totals, e.amount), emptyTotals());
}
