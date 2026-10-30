import { TestBed } from '@angular/core/testing';
import { Money, currency } from '@pp/shared/kernel';
import { defaultSettings } from '../domain/app-settings';
import { InMemorySettingsRepository } from '../infrastructure/in-memory-settings.repository';
import { SETTINGS_REPOSITORY } from './ports/settings.repository';
import { SettingsStore } from './settings.store';

const setup = (repository = new InMemorySettingsRepository()) => {
  TestBed.configureTestingModule({
    providers: [{ provide: SETTINGS_REPOSITORY, useValue: repository }],
  });
  return { repository, store: TestBed.inject(SettingsStore) };
};

describe('SettingsStore', () => {
  it('exposes defaults on an empty database', async () => {
    const { store } = setup();
    expect(store.ready()).toBe(false);
    expect(store.defaultCurrency()).toBe('PEN');
    await vi.waitFor(() => expect(store.ready()).toBe(true));
    expect(store.settings()).toEqual(defaultSettings());
  });

  it('loads stored settings', async () => {
    const repository = new InMemorySettingsRepository();
    await repository.save({ ...defaultSettings(), theme: 'dark' });
    const { store } = setup(repository);
    await vi.waitFor(() => expect(store.theme()).toBe('dark'));
  });

  it('persists a valid update and reflects it immediately', async () => {
    const { store, repository } = setup();
    await vi.waitFor(() => expect(store.ready()).toBe(true));
    const result = await store.update({ theme: 'light' });
    expect(result.ok).toBe(true);
    expect(store.theme()).toBe('light');
    expect((await repository.load())?.theme).toBe('light');
  });

  it('rejects a currency change without a new threshold and saves nothing', async () => {
    const { store, repository } = setup();
    await vi.waitFor(() => expect(store.ready()).toBe(true));
    const result = await store.update({ defaultCurrency: currency('USD') });
    expect(result.ok).toBe(false);
    expect(store.defaultCurrency()).toBe('PEN');
    expect(await repository.load()).toBeNull();
  });

  it('accepts a currency change with its threshold', async () => {
    const { store } = setup();
    await vi.waitFor(() => expect(store.ready()).toBe(true));
    const usd = currency('USD');
    const result = await store.update({ defaultCurrency: usd, antExpenseThreshold: Money.of(5, usd) });
    expect(result.ok).toBe(true);
    expect(store.antExpenseThreshold()).toEqual(Money.of(5, usd));
  });
});
