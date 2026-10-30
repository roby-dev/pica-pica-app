import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from '../../domain/catalog.seeds';
import type { CatalogRepository } from './catalog.repository';

/** Behaviour every CatalogRepository adapter must share. */
export function catalogRepositoryContract(
  name: string,
  create: () => CatalogRepository | Promise<CatalogRepository>,
): void {
  describe(`CatalogRepository contract: ${name}`, () => {
    it('starts empty and unseeded', async () => {
      const repository = await create();
      expect(await repository.isSeeded()).toBe(false);
      expect(await repository.listCategories()).toEqual([]);
      expect(await repository.listPaymentMethods()).toEqual([]);
    });

    it('seeds categories and methods and remembers it', async () => {
      const repository = await create();
      await repository.seed(SEED_CATEGORIES, SEED_PAYMENT_METHODS, '2026-10-30T13:00:00.000Z');
      expect(await repository.isSeeded()).toBe(true);
      expect(await repository.listCategories()).toEqual(SEED_CATEGORIES);
      expect(await repository.listPaymentMethods()).toEqual(SEED_PAYMENT_METHODS);
    });

    it('saves edits, including archiving', async () => {
      const repository = await create();
      await repository.seed(SEED_CATEGORIES, SEED_PAYMENT_METHODS, 'x');
      await repository.saveCategory({ ...SEED_CATEGORIES[0], archived: true });
      await repository.savePaymentMethod({ ...SEED_PAYMENT_METHODS[0], name: 'Cash' });

      const categories = await repository.listCategories();
      expect(categories.find((c) => c.id === SEED_CATEGORIES[0].id)?.archived).toBe(true);
      expect(categories).toHaveLength(SEED_CATEGORIES.length);
      const methods = await repository.listPaymentMethods();
      expect(methods.find((m) => m.id === SEED_PAYMENT_METHODS[0].id)?.name).toBe('Cash');
    });
  });
}
