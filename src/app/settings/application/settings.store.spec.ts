import { TestBed } from '@angular/core/testing';
import { Money, currency } from '@pp/shared/kernel';
import { defaultSettings, SETTINGS_REPOSITORY, SettingsStore } from '@pp/settings';
import { InMemorySettingsRepository } from '../infrastructure/in-memory-settings.repository';

const budgets = [Money.of(150, currency('PEN')), Money.of(40, currency('USD'))];

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

  it('keeps distinct budgets through a threshold and default currency change', async () => {
    const { store, repository } = setup();
    await vi.waitFor(() => expect(store.ready()).toBe(true));
    expect(store.weeklyBudgets()).toEqual([]);
    const patch = { weeklyBudgets: budgets, theme: 'light' as const };
    expect((await store.update(patch)).ok).toBe(true);
    expect(store.weeklyBudgets()).toEqual(budgets);
    const usd = currency('USD');
    const result = await store.update({ defaultCurrency: usd, antExpenseThreshold: Money.of(5, usd) });
    expect(result.ok).toBe(true);
    expect(store.antExpenseThreshold()).toEqual(Money.of(5, usd));
    expect(store.weeklyBudgets()).toEqual(budgets);
    expect(await repository.load()).toMatchObject({ weeklyBudgets: budgets });
  });

  it('preserves persisted caps if a legacy patch arrives before settings have loaded', async () => {
    const repository = new InMemorySettingsRepository();
    await repository.save({ ...defaultSettings(), weeklyBudgets: budgets });
    const load = repository.load.bind(repository);
    let finishLoad!: () => void;
    const waiting = new Promise<void>((resolve) => { finishLoad = resolve; });
    vi.spyOn(repository, 'load').mockImplementation(async () => {
      await waiting;
      return load();
    });
    const { store } = setup(repository);
    expect(store.ready()).toBe(false);
    const update = store.update({ theme: 'light' });
    finishLoad();
    expect((await update).ok).toBe(true);
    expect(store.weeklyBudgets()).toEqual(budgets);
    expect(await repository.load()).toMatchObject({ weeklyBudgets: budgets, theme: 'light' });
  });

  it.each([
    [0, 'PEN'], [-1, 'PEN'], [1.5, 'PEN'], [Number.MAX_SAFE_INTEGER + 1, 'PEN'],
    [1, 'ZZZ9'], [1, 'usd'],
  ])('rejects an invalid cap (%s %s) without saving any part of the patch', async (amountMinor, code) => {
    const { store, repository } = setup();
    await vi.waitFor(() => expect(store.ready()).toBe(true));
    const validPatch = { weeklyBudgets: budgets, theme: 'light' as const };
    await store.update(validPatch);
    const before = await repository.load();
    const badPatch = {
      weeklyBudgets: [budgets[1], { amountMinor, currency: code as ReturnType<typeof currency> }],
      theme: 'dark' as const,
    };
    const result = await store.update(badPatch);
    expect(!result.ok && result.error.code).toBe('INVALID_WEEKLY_BUDGETS');
    expect(store.theme()).toBe('light');
    expect(await repository.load()).toBe(before);
  });
});
