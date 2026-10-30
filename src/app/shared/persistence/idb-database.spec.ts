import 'fake-indexeddb/auto';
import { DB_VERSION, openPicaPicaDb } from './idb-database';
import { requestPersistentStorage } from './storage-persist';

let counter = 0;
const freshName = () => `pica-pica-test-${counter++}`;

describe('openPicaPicaDb', () => {
  it('creates every store of schema v1', async () => {
    const db = await openPicaPicaDb(freshName());
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual([
      'categories',
      'expenses',
      'meta',
      'paymentMethods',
      'settings',
    ]);
    db.close();
  });

  it('indexes expenses by date, currency+date and category', async () => {
    const db = await openPicaPicaDb(freshName());
    const expenses = db.transaction('expenses').store;
    expect([...expenses.indexNames].sort()).toEqual([
      'by_categoryId',
      'by_currency_occurredAt',
      'by_occurredAt',
    ]);
    expect(expenses.index('by_currency_occurredAt').keyPath).toEqual(['currency', 'occurredAt']);
    db.close();
  });

  it('keeps stored data when reopened', async () => {
    const name = freshName();
    const first = await openPicaPicaDb(name);
    await first.put('meta', { key: 'schema', version: 1, seededAt: null });
    first.close();

    const second = await openPicaPicaDb(name);
    expect(await second.get('meta', 'schema')).toEqual({ key: 'schema', version: 1, seededAt: null });
    second.close();
  });

  it('queries expenses per currency and date range', async () => {
    const db = await openPicaPicaDb(freshName());
    const base = {
      what: 'Café',
      categoryId: 'c',
      paymentMethodId: 'p',
      place: null,
      placeKey: null,
      occurredDay: '2026-10-30',
      note: null,
      createdAt: '2026-10-30T08:00:00-05:00',
      updatedAt: '2026-10-30T08:00:00-05:00',
      deletedAt: null,
    };
    await db.put('expenses', { ...base, id: 'a', amountMinor: 900, currency: 'PEN', occurredAt: '2026-10-30T08:00:00-05:00' });
    await db.put('expenses', { ...base, id: 'b', amountMinor: 500, currency: 'USD', occurredAt: '2026-10-30T09:00:00-05:00' });
    await db.put('expenses', { ...base, id: 'c', amountMinor: 150, currency: 'PEN', occurredAt: '2026-10-31T09:00:00-05:00' });

    const pen = await db.getAllFromIndex(
      'expenses',
      'by_currency_occurredAt',
      IDBKeyRange.bound(['PEN', '2026-10-30'], ['PEN', '2026-10-30￿']),
    );
    expect(pen.map((e) => e.id)).toEqual(['a']);
    db.close();
  });
});

describe('requestPersistentStorage', () => {
  it('returns true when already persisted without asking again', async () => {
    const persist = vi.fn();
    const storage = { persisted: async () => true, persist } as unknown as StorageManager;
    expect(await requestPersistentStorage(storage)).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('asks the browser otherwise', async () => {
    const storage = { persisted: async () => false, persist: async () => true } as unknown as StorageManager;
    expect(await requestPersistentStorage(storage)).toBe(true);
  });

  it('never throws and reports false when unsupported or failing', async () => {
    expect(await requestPersistentStorage({} as StorageManager)).toBe(false);
    const failing = { persist: async () => Promise.reject(new Error('denied')) } as unknown as StorageManager;
    expect(await requestPersistentStorage(failing)).toBe(false);
  });
});
