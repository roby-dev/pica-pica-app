import { inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { CLOCK } from '@pp/shared/di';
import { CATALOG_REPOSITORY } from './application/ports/catalog.repository';
import { EXPENSE_REPOSITORY } from './application/ports/expense.repository';
import { seedCatalog } from './application/use-cases/seed-catalog';
import { IdbCatalogRepository } from './infrastructure/indexeddb/idb-catalog.repository';
import { IdbExpenseRepository } from './infrastructure/indexeddb/idb-expense.repository';
import { InMemoryCatalogRepository } from './infrastructure/memory/in-memory-catalog.repository';
import { InMemoryExpenseRepository } from './infrastructure/memory/in-memory-expense.repository';

export interface ExpensesOptions {
  readonly persistence: 'indexeddb' | 'memory';
}

/** Binds the expense and catalog ports to an adapter and seeds the starting catalog on first run. */
export function provideExpenses(options: ExpensesOptions) {
  const memory = options.persistence === 'memory';
  return makeEnvironmentProviders([
    { provide: EXPENSE_REPOSITORY, useClass: memory ? InMemoryExpenseRepository : IdbExpenseRepository },
    { provide: CATALOG_REPOSITORY, useClass: memory ? InMemoryCatalogRepository : IdbCatalogRepository },
    provideAppInitializer(() => seedCatalog(inject(CATALOG_REPOSITORY), inject(CLOCK).now())),
  ]);
}
