import { InjectionToken } from '@angular/core';
import type { Category, PaymentMethod } from '../../domain/category';

export interface CatalogRepository {
  listCategories(): Promise<readonly Category[]>;
  listPaymentMethods(): Promise<readonly PaymentMethod[]>;
  saveCategory(category: Category): Promise<void>;
  savePaymentMethod(method: PaymentMethod): Promise<void>;
  /** True once the starting catalog was written, even if the user later archived everything. */
  isSeeded(): Promise<boolean>;
  /** Writes the starting catalog and marks it as seeded in one step. */
  seed(categories: readonly Category[], methods: readonly PaymentMethod[], at: string): Promise<void>;
}

export const CATALOG_REPOSITORY = new InjectionToken<CatalogRepository>('CatalogRepository');
