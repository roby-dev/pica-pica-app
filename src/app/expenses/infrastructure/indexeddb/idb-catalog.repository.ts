import { Injectable, inject } from '@angular/core';
import { IDB_DATABASE } from '@pp/shared/di';
import type { CatalogRepository } from '../../application/ports/catalog.repository';
import type { Category, PaymentMethod, PaymentMethodKind } from '../../domain/category';
import { categoryId, paymentMethodId } from '../../domain/ids';

const META_KEY = 'schema';
const METHOD_KINDS: readonly PaymentMethodKind[] = ['cash', 'debit', 'credit', 'transfer', 'wallet', 'other'];

const byPosition = (a: { position: number; name: string }, b: { position: number; name: string }) =>
  a.position - b.position || a.name.localeCompare(b.name);

@Injectable()
export class IdbCatalogRepository implements CatalogRepository {
  private readonly database = inject(IDB_DATABASE);

  async listCategories(): Promise<readonly Category[]> {
    const db = await this.database;
    const records = await db.getAll('categories');
    return records.map((r) => ({ ...r, id: categoryId(r.id) })).sort(byPosition);
  }

  async listPaymentMethods(): Promise<readonly PaymentMethod[]> {
    const db = await this.database;
    const records = await db.getAll('paymentMethods');
    return records.map((r) => ({
      ...r,
      id: paymentMethodId(r.id),
      kind: METHOD_KINDS.find((kind) => kind === r.kind) ?? 'other',
    })).sort(byPosition);
  }

  async saveCategory(category: Category): Promise<void> {
    const db = await this.database;
    await db.put('categories', { ...category });
  }

  async savePaymentMethod(method: PaymentMethod): Promise<void> {
    const db = await this.database;
    await db.put('paymentMethods', { ...method });
  }

  async isSeeded(): Promise<boolean> {
    const db = await this.database;
    return ((await db.get('meta', META_KEY))?.seededAt ?? null) !== null;
  }

  async seed(categories: readonly Category[], methods: readonly PaymentMethod[], at: string): Promise<void> {
    const db = await this.database;
    const tx = db.transaction(['categories', 'paymentMethods', 'meta'], 'readwrite');
    await Promise.all([
      ...categories.map((c) => tx.objectStore('categories').put({ ...c })),
      ...methods.map((m) => tx.objectStore('paymentMethods').put({ ...m })),
      tx.objectStore('meta').put({ key: META_KEY, version: 1, seededAt: at }),
      tx.done,
    ]);
  }
}
