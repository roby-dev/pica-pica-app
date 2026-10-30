import { DEFAULT_CURRENCY, Money, currency } from '@pp/shared/kernel';
import { defaultSettings } from '../../domain/app-settings';
import type { SettingsRepository } from './settings.repository';

/** Behaviour every SettingsRepository adapter (memory, IndexedDB, future HTTP) must share. */
export function settingsRepositoryContract(
  name: string,
  create: () => SettingsRepository | Promise<SettingsRepository>,
): void {
  describe(`SettingsRepository contract: ${name}`, () => {
    it('returns null before anything is saved', async () => {
      const repository = await create();
      expect(await repository.load()).toBeNull();
    });

    it('round-trips settings including money and currency', async () => {
      const repository = await create();
      const settings = {
        ...defaultSettings(),
        defaultCurrency: currency('USD'),
        antExpenseThreshold: Money.of(5, currency('USD')),
        theme: 'dark' as const,
        lastBackupAt: '2026-10-30T10:00:00-05:00',
      };
      await repository.save(settings);
      expect(await repository.load()).toEqual(settings);
    });

    it('overwrites the previous value', async () => {
      const repository = await create();
      await repository.save(defaultSettings());
      await repository.save({ ...defaultSettings(), theme: 'light' });
      expect((await repository.load())?.theme).toBe('light');
      expect((await repository.load())?.defaultCurrency).toBe(DEFAULT_CURRENCY);
    });
  });
}
