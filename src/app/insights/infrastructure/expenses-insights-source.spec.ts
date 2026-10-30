import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CatalogStore, ExpensesStore, provideExpenses } from '@pp/expenses';
import { provideSettings, SettingsStore } from '@pp/settings';
import { toIsoWithOffset } from '@pp/shared/kernel';
import { InsightsStore } from '../application/insights.store';
import { provideInsights } from '../insights.providers';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideSettings({ persistence: 'memory' }),
      provideExpenses({ persistence: 'memory' }),
      provideInsights(),
    ],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(catalog.activeCategories().length).toBeGreaterThan(0));
  const expenses = TestBed.inject(ExpensesStore);
  const add = async (what: string, amountMinor: number) => {
    const result = await expenses.add({
      what,
      amountMinor,
      categoryId: catalog.activeCategories()[0].id,
      paymentMethodId: catalog.activeMethods()[0].id,
      occurredAt: toIsoWithOffset(new Date()),
    });
    if (!result.ok) throw result.error;
    return result.value;
  };
  return { expenses, add, insights: TestBed.inject(InsightsStore), settings: TestBed.inject(SettingsStore), catalog };
}

describe('ExpensesInsightsSource (through InsightsStore)', () => {
  it('shows a new expense in the analytics right away', async () => {
    const { add, insights } = await setup();
    expect(insights.hasData()).toBe(false);
    await add('Café', 450);
    expect(insights.totalMinor()).toBe(450);
    expect(insights.count()).toBe(1);
  });

  it('drops a deleted expense and brings it back on undo', async () => {
    const { add, insights, expenses } = await setup();
    const saved = await add('Café', 450);
    await expenses.remove(saved.id);
    expect(insights.hasData()).toBe(false);
    await expenses.undoRemove();
    expect(insights.totalMinor()).toBe(450);
  });

  it('reclassifies ant expenses when the threshold changes in settings', async () => {
    const { add, insights, settings } = await setup();
    await add('Café', 450);
    await add('Cena', 8000);
    await vi.waitFor(() => expect(settings.ready()).toBe(true));
    expect(insights.ant().antCount).toBe(1);

    await settings.update({ antExpenseThreshold: { amountMinor: 10_000, currency: insights.currency() } });
    await vi.waitFor(() => expect(insights.ant().antCount).toBe(2));
  });

  it('names categories from the catalog', async () => {
    const { add, insights, catalog } = await setup();
    await add('Café', 450);
    expect(insights.categories()[0].label).toBe(catalog.activeCategories()[0].name);
  });
});
