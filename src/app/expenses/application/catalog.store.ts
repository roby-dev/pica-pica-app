import { Injectable, computed, inject, resource } from '@angular/core';
import { err, ok, type DomainError, type Result } from '@pp/shared/kernel';
import type { Category, PaymentMethod } from '../domain/category';
import { ExpenseNotFoundError, ExpensePersistenceError } from '../domain/expense.errors';
import type { CategoryId, PaymentMethodId } from '../domain/ids';
import { CATALOG_REPOSITORY } from './ports/catalog.repository';
import { withCategoryArchived, withMethodArchived } from './use-cases/archive-category';
import type { CatalogSnapshot } from './use-cases/catalog-check';

interface Catalog extends CatalogSnapshot {
  readonly categories: readonly Category[];
  readonly methods: readonly PaymentMethod[];
}

const EMPTY: Catalog = { categories: [], methods: [] };

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly repository = inject(CATALOG_REPOSITORY);

  private readonly loaded = resource<Catalog, void>({
    loader: async () => {
      const [categories, methods] = await Promise.all([
        this.repository.listCategories(),
        this.repository.listPaymentMethods(),
      ]);
      return { categories, methods };
    },
  });

  private readonly catalog = computed(() => this.loaded.value() ?? EMPTY);

  readonly ready = computed(() => this.loaded.hasValue());
  readonly categories = computed(() => this.catalog().categories);
  readonly methods = computed(() => this.catalog().methods);
  readonly activeCategories = computed(() => this.categories().filter((c) => !c.archived));
  readonly activeMethods = computed(() => this.methods().filter((m) => !m.archived));
  readonly categoryById = computed(() => new Map(this.categories().map((c) => [c.id, c])));
  readonly methodById = computed(() => new Map(this.methods().map((m) => [m.id, m])));
  readonly snapshot = computed<CatalogSnapshot>(() => this.catalog());

  /** Adds the category when this device does not have it yet (older installs predate newer seeds). */
  async ensureCategory(category: Category): Promise<Result<Category, DomainError>> {
    const existing = this.categoryById().get(category.id);
    if (existing) return ok(existing);
    const added = { ...category, position: this.categories().length };
    return this.commit(
      { ...this.catalog(), categories: [...this.categories(), added] },
      () => this.repository.saveCategory(added),
      added,
    );
  }

  async setCategoryArchived(id: CategoryId, archived: boolean): Promise<Result<Category, DomainError>> {
    const existing = this.categoryById().get(id);
    if (!existing) return err(new ExpenseNotFoundError(id));
    const updated = withCategoryArchived(existing, archived);
    return this.commit(
      { ...this.catalog(), categories: this.categories().map((c) => (c.id === id ? updated : c)) },
      () => this.repository.saveCategory(updated),
      updated,
    );
  }

  async setMethodArchived(id: PaymentMethodId, archived: boolean): Promise<Result<PaymentMethod, DomainError>> {
    const existing = this.methodById().get(id);
    if (!existing) return err(new ExpenseNotFoundError(id));
    const updated = withMethodArchived(existing, archived);
    return this.commit(
      { ...this.catalog(), methods: this.methods().map((m) => (m.id === id ? updated : m)) },
      () => this.repository.savePaymentMethod(updated),
      updated,
    );
  }

  /** Shows the change immediately and rolls it back if storage refuses it. */
  private async commit<T>(next: Catalog, persist: () => Promise<void>, value: T): Promise<Result<T, DomainError>> {
    const previous = this.catalog();
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
