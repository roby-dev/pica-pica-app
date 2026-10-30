import { TestBed } from '@angular/core/testing';
import { SEED_CATEGORIES } from '../domain/catalog.seeds';
import { InMemoryCatalogRepository } from '../infrastructure/memory/in-memory-catalog.repository';
import { CatalogStore } from './catalog.store';
import { CATALOG_REPOSITORY, type CatalogRepository } from './ports/catalog.repository';
import { seedCatalog } from './use-cases/seed-catalog';

async function setup(repository: CatalogRepository = new InMemoryCatalogRepository()) {
  await seedCatalog(repository, new Date());
  TestBed.configureTestingModule({ providers: [{ provide: CATALOG_REPOSITORY, useValue: repository }] });
  const store = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(store.ready()).toBe(true));
  return { store, repository };
}

describe('CatalogStore', () => {
  it('loads the seeded catalog in display order', async () => {
    const { store } = await setup();
    expect(store.categories().map((c) => c.name)).toEqual(SEED_CATEGORIES.map((c) => c.name));
    expect(store.activeMethods().map((m) => m.name)[0]).toBe('Efectivo');
    expect(store.categoryById().get(SEED_CATEGORIES[0].id)?.name).toBe('Café');
  });

  it('archives a category: hidden from pickers, still resolvable, persisted', async () => {
    const { store, repository } = await setup();
    const result = await store.setCategoryArchived(SEED_CATEGORIES[0].id, true);
    expect(result.ok).toBe(true);
    expect(store.activeCategories().some((c) => c.id === SEED_CATEGORIES[0].id)).toBe(false);
    expect(store.categoryById().get(SEED_CATEGORIES[0].id)?.archived).toBe(true);
    expect((await repository.listCategories()).find((c) => c.id === SEED_CATEGORIES[0].id)?.archived).toBe(true);
  });

  it('unarchives a payment method', async () => {
    const { store } = await setup();
    const first = store.methods()[0];
    await store.setMethodArchived(first.id, true);
    expect(store.activeMethods().some((m) => m.id === first.id)).toBe(false);
    await store.setMethodArchived(first.id, false);
    expect(store.activeMethods().some((m) => m.id === first.id)).toBe(true);
  });

  it('rolls back when storage fails', async () => {
    const repository = new InMemoryCatalogRepository();
    const { store } = await setup(repository);
    repository.saveCategory = async () => {
      throw new Error('disk full');
    };
    const result = await store.setCategoryArchived(SEED_CATEGORIES[0].id, true);
    expect(result.ok).toBe(false);
    expect(store.categoryById().get(SEED_CATEGORIES[0].id)?.archived).toBe(false);
  });

  it('reports unknown ids', async () => {
    const { store } = await setup();
    expect((await store.setCategoryArchived('nope' as never, true)).ok).toBe(false);
  });

  it('renames a category and persists it', async () => {
    const { store, repository } = await setup();
    const result = await store.renameCategory(SEED_CATEGORIES[0].id, '  Cafecito ');
    expect(result.ok).toBe(true);
    expect(store.categoryById().get(SEED_CATEGORIES[0].id)?.name).toBe('Cafecito');
    expect((await repository.listCategories())[0].name).toBe('Cafecito');
  });

  it.each(['', '   ', 'x'.repeat(25), 'snacks'])('refuses the category name %j', async (name) => {
    const { store } = await setup();
    expect((await store.renameCategory(SEED_CATEGORIES[0].id, name)).ok).toBe(false);
    expect(store.categoryById().get(SEED_CATEGORIES[0].id)?.name).toBe('Café');
  });

  it('renames a payment method', async () => {
    const { store } = await setup();
    const id = store.methods()[0].id;
    expect((await store.renameMethod(id, 'Cash')).ok).toBe(true);
    expect(store.methodById().get(id)?.name).toBe('Cash');
  });
});
