import type { CatalogRepository } from '../../application/ports/catalog.repository';
import type { Category, PaymentMethod } from '../../domain/category';

const byPosition = (a: { position: number; name: string }, b: { position: number; name: string }) =>
  a.position - b.position || a.name.localeCompare(b.name);

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly categories = new Map<string, Category>();
  private readonly methods = new Map<string, PaymentMethod>();
  private seeded = false;

  async listCategories(): Promise<readonly Category[]> {
    return [...this.categories.values()].sort(byPosition);
  }

  async listPaymentMethods(): Promise<readonly PaymentMethod[]> {
    return [...this.methods.values()].sort(byPosition);
  }

  async saveCategory(category: Category): Promise<void> {
    this.categories.set(category.id, category);
  }

  async savePaymentMethod(method: PaymentMethod): Promise<void> {
    this.methods.set(method.id, method);
  }

  async isSeeded(): Promise<boolean> {
    return this.seeded;
  }

  async seed(categories: readonly Category[], methods: readonly PaymentMethod[]): Promise<void> {
    for (const category of categories) this.categories.set(category.id, category);
    for (const method of methods) this.methods.set(method.id, method);
    this.seeded = true;
  }
}
