import { DomainError } from '@pp/shared/kernel';

export type ExpenseField =
  | 'what'
  | 'amount'
  | 'category'
  | 'paymentMethod'
  | 'place'
  | 'occurredAt'
  | 'note';

/** A rejected field. `field` lets a form show the message next to the right input. */
export class ExpenseValidationError extends DomainError {
  readonly code = 'EXPENSE_INVALID';

  constructor(
    readonly field: ExpenseField,
    message: string,
  ) {
    super(message);
  }
}

/** Archived categories and methods stay valid on old expenses but cannot be picked for new ones. */
export class ArchivedCatalogItemError extends DomainError {
  readonly code = 'CATALOG_ITEM_ARCHIVED';

  constructor(readonly itemName: string) {
    super(`"${itemName}" is archived and cannot be used for new expenses`);
  }
}

/** A category or method that old expenses still reference must be archived, not deleted. */
export class CatalogItemInUseError extends DomainError {
  readonly code = 'CATALOG_ITEM_IN_USE';

  constructor(readonly itemName: string) {
    super(`"${itemName}" is used by existing expenses; archive it instead`);
  }
}

/** Storage rejected a write. The UI has already been rolled back when this is returned. */
export class ExpensePersistenceError extends DomainError {
  readonly code = 'EXPENSE_PERSISTENCE_FAILED';

  constructor() {
    super('The change could not be saved. Try again.');
  }
}

export class ExpenseNotFoundError extends DomainError {
  readonly code = 'EXPENSE_NOT_FOUND';

  constructor(readonly id: string) {
    super(`Expense ${id} was not found`);
  }
}
