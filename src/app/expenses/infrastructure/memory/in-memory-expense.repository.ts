import { filterExpenses, type ExpenseQuery, type ExpenseRepository } from '../../application/ports/expense.repository';
import type { Expense } from '../../domain/expense';
import type { ExpenseId } from '../../domain/ids';

export class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly items = new Map<ExpenseId, Expense>();

  async list(query?: ExpenseQuery): Promise<readonly Expense[]> {
    return filterExpenses([...this.items.values()], query);
  }

  async get(id: ExpenseId): Promise<Expense | null> {
    return this.items.get(id) ?? null;
  }

  async save(expense: Expense): Promise<void> {
    this.items.set(expense.id, expense);
  }

  async saveMany(expenses: readonly Expense[]): Promise<void> {
    for (const expense of expenses) this.items.set(expense.id, expense);
  }

  async softDelete(id: ExpenseId, at: string): Promise<void> {
    const existing = this.items.get(id);
    if (existing) this.items.set(id, { ...existing, deletedAt: at, updatedAt: at });
  }

  async restore(id: ExpenseId, at: string): Promise<void> {
    const existing = this.items.get(id);
    if (existing) this.items.set(id, { ...existing, deletedAt: null, updatedAt: at });
  }
}
