import { InjectionToken } from '@angular/core';
import type { CurrencyCode } from '@pp/shared/kernel';
import type { Expense } from '../../domain/expense';
import type { ExpenseId } from '../../domain/ids';
import { localDayKey } from '../../domain/occurred-at';

export interface ExpenseQuery {
  /** Inclusive local day, `YYYY-MM-DD`. */
  readonly fromDay?: string;
  /** Inclusive local day, `YYYY-MM-DD`. */
  readonly toDay?: string;
  readonly currency?: CurrencyCode;
  /** Soft-deleted expenses are hidden unless this is true. */
  readonly includeDeleted?: boolean;
}

/** Promise-based so IndexedDB today and an HTTP backend later fit the same contract. */
export interface ExpenseRepository {
  /** Newest first. */
  list(query?: ExpenseQuery): Promise<readonly Expense[]>;
  get(id: ExpenseId): Promise<Expense | null>;
  /** Insert or replace. */
  save(expense: Expense): Promise<void>;
  /** Used by import; replaces expenses with the same id. */
  saveMany(expenses: readonly Expense[]): Promise<void>;
  /** Unknown ids are ignored. */
  softDelete(id: ExpenseId, at: string): Promise<void>;
  /** Unknown ids are ignored. */
  restore(id: ExpenseId, at: string): Promise<void>;
}

export const EXPENSE_REPOSITORY = new InjectionToken<ExpenseRepository>('ExpenseRepository');

/** Shared filter and ordering so every adapter answers a query the same way. */
export function filterExpenses(expenses: readonly Expense[], query: ExpenseQuery = {}): readonly Expense[] {
  return expenses
    .filter((expense) => {
      if (!query.includeDeleted && expense.deletedAt !== null) return false;
      if (query.currency && expense.amount.currency !== query.currency) return false;
      const day = localDayKey(expense.occurredAt);
      if (query.fromDay && day < query.fromDay) return false;
      if (query.toDay && day > query.toDay) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}
