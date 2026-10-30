import type { DBSchema } from 'idb';

/**
 * Plain stored shapes. Features own the mapping between these records and their domain types;
 * this file only knows the storage layout.
 */
export interface ExpenseRecord {
  id: string;
  what: string;
  amountMinor: number;
  currency: string;
  categoryId: string;
  paymentMethodId: string;
  place: string | null;
  placeKey: string | null;
  occurredAt: string;
  occurredDay: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CategoryRecord {
  id: string;
  name: string;
  emoji: string;
  color: string;
  archived: boolean;
  position: number;
}

export interface PaymentMethodRecord {
  id: string;
  name: string;
  kind: string;
  archived: boolean;
  position: number;
}

export interface SettingsRecord {
  key: 'app';
  defaultCurrency: string;
  antExpenseThreshold: { amountMinor: number; currency: string };
  theme: 'system' | 'light' | 'dark';
  weekStartsOn: 1;
  lastBackupAt: string | null;
}

export interface MetaRecord {
  key: string;
  version: number;
  seededAt: string | null;
}

export interface PicaPicaDb extends DBSchema {
  expenses: {
    key: string;
    value: ExpenseRecord;
    indexes: {
      by_occurredAt: string;
      by_currency_occurredAt: [string, string];
      by_categoryId: string;
    };
  };
  categories: { key: string; value: CategoryRecord };
  paymentMethods: { key: string; value: PaymentMethodRecord };
  settings: { key: string; value: SettingsRecord };
  meta: { key: string; value: MetaRecord };
}
