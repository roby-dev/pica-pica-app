import { openDB, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb';
import type { PicaPicaDb } from './idb-schema';

export const DB_NAME = 'pica-pica';

type Upgrade = (
  db: IDBPDatabase<PicaPicaDb>,
  tx: IDBPTransaction<PicaPicaDb, StoreNames<PicaPicaDb>[], 'versionchange'>,
) => void;

/**
 * Ordered schema migrations. `MIGRATIONS[0]` creates version 1; each later entry upgrades by one.
 * Never edit a shipped migration: append a new one.
 */
const MIGRATIONS: readonly Upgrade[] = [
  (db) => {
    const expenses = db.createObjectStore('expenses', { keyPath: 'id' });
    expenses.createIndex('by_occurredAt', 'occurredAt');
    // Currency lives on every expense so multi-currency needs no later migration.
    expenses.createIndex('by_currency_occurredAt', ['currency', 'occurredAt']);
    expenses.createIndex('by_categoryId', 'categoryId');

    db.createObjectStore('categories', { keyPath: 'id' });
    db.createObjectStore('paymentMethods', { keyPath: 'id' });
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('meta', { keyPath: 'key' });
  },
];

export const DB_VERSION = MIGRATIONS.length;

export type PicaPicaDatabase = IDBPDatabase<PicaPicaDb>;

/** Opens (and migrates) the app database. `name` is overridable so tests can isolate state. */
export function openPicaPicaDb(name: string = DB_NAME): Promise<PicaPicaDatabase> {
  return openDB<PicaPicaDb>(name, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      for (let version = oldVersion; version < MIGRATIONS.length; version++) {
        MIGRATIONS[version](db, tx);
      }
    },
  });
}
