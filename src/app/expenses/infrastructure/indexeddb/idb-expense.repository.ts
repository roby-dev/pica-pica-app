import { Injectable, inject } from '@angular/core';
import { IDB_DATABASE } from '@pp/shared/di';
import { filterExpenses, type ExpenseQuery, type ExpenseRepository } from '../../application/ports/expense.repository';
import type { Expense } from '../../domain/expense';
import type { ExpenseId } from '../../domain/ids';
import { toExpense, toRecord } from './expense.mapper';

@Injectable()
export class IdbExpenseRepository implements ExpenseRepository {
  private readonly database = inject(IDB_DATABASE);

  async list(query?: ExpenseQuery): Promise<readonly Expense[]> {
    const db = await this.database;
    const records = await db.getAll('expenses');
    const expenses = records.map(toExpense).filter((e): e is Expense => e !== null);
    return filterExpenses(expenses, query);
  }

  async get(id: ExpenseId): Promise<Expense | null> {
    const db = await this.database;
    const record = await db.get('expenses', id);
    return record ? toExpense(record) : null;
  }

  async save(expense: Expense): Promise<void> {
    const db = await this.database;
    await db.put('expenses', toRecord(expense));
  }

  async saveMany(expenses: readonly Expense[]): Promise<void> {
    const db = await this.database;
    const tx = db.transaction('expenses', 'readwrite');
    await Promise.all([...expenses.map((e) => tx.store.put(toRecord(e))), tx.done]);
  }

  async softDelete(id: ExpenseId, at: string): Promise<void> {
    await this.patch(id, { deletedAt: at, updatedAt: at });
  }

  async restore(id: ExpenseId, at: string): Promise<void> {
    await this.patch(id, { deletedAt: null, updatedAt: at });
  }

  private async patch(id: ExpenseId, changes: { deletedAt: string | null; updatedAt: string }): Promise<void> {
    const db = await this.database;
    const tx = db.transaction('expenses', 'readwrite');
    const record = await tx.store.get(id);
    if (record) await tx.store.put({ ...record, ...changes });
    await tx.done;
  }
}
