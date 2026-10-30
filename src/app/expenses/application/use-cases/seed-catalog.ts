import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from '../../domain/catalog.seeds';
import type { CatalogRepository } from '../ports/catalog.repository';

/** First-run setup. Idempotent: it never overwrites what the user has since edited or archived. */
export async function seedCatalog(repository: CatalogRepository, now: Date): Promise<void> {
  if (await repository.isSeeded()) return;
  await repository.seed(SEED_CATEGORIES, SEED_PAYMENT_METHODS, now.toISOString());
}
