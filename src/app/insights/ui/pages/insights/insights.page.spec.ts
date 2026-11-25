import { ApplicationInitStatus } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CatalogStore, ExpensesStore, provideExpenses } from '@pp/expenses';
import { provideSettings, SettingsStore } from '@pp/settings';
import { CLOCK, LiveClock } from '@pp/shared/di';
import { currency, Money, toIsoWithOffset } from '@pp/shared/kernel';
import { FakeClock } from '@pp/shared/testing';
import { provideInsights } from '../../../insights.providers';
import { InsightsPage } from './insights.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup(now = new Date()) {
  const clock = new FakeClock(now);
  TestBed.configureTestingModule({
    providers: [
      { provide: CLOCK, useValue: clock },
      provideSettings({ persistence: 'memory' }),
      provideExpenses({ persistence: 'memory' }),
      provideInsights(),
    ],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(catalog.activeCategories().length).toBeGreaterThan(0));
  const expenses = TestBed.inject(ExpensesStore);
  const add = async (
    what: string,
    amountMinor: number,
    code = 'PEN',
    place?: string,
    date = clock.now(),
    category = 'Café',
  ) => {
    const result = await expenses.add({
      what,
      amountMinor,
      currency: currency(code),
      categoryId: catalog.activeCategories().find((c) => c.name === category)!.id,
      paymentMethodId: catalog.activeMethods()[0].id,
      place,
      occurredAt: toIsoWithOffset(date),
    });
    if (!result.ok) throw result.error;
    return result.value.id;
  };
  const setBudgets = async (...caps: Money[]) => {
    const result = await TestBed.inject(SettingsStore).update({ weeklyBudgets: caps });
    if (!result.ok) throw result.error;
  };
  const render = (): { fixture: ComponentFixture<InsightsPage>; root: HTMLElement } => {
    const fixture = TestBed.createComponent(InsightsPage);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };
  return { add, clock, expenses, render, setBudgets };
}

describe('InsightsPage', () => {
  it('explains an empty period instead of showing empty charts', async () => {
    const { render } = await setup();
    const { fixture, root } = render();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text(root)).toContain('Sin gastos en este período');
    });
    expect(root.querySelector('pp-bar-chart')).toBeNull();
    expect(root.querySelector('[aria-label="Presupuesto semanal"]')).toBeNull();
  });

  it('shows the total, the ant share and the breakdowns for a period with spending', async () => {
    const { add, render } = await setup();
    await add('Café', 450, 'PEN', 'Starbucks');
    await add('Café', 450, 'PEN', 'Starbucks');
    await add('Cena', 8000);
    const { fixture, root } = render();
    fixture.detectChanges();

    const body = text(root);
    expect(body).toContain('Total gastado');
    expect(body).toContain('S/ 89.00');
    expect(body).toContain('Gastos hormiga');
    expect(body).toContain('10%');
    expect(body).toContain('2 gastos de');
    expect(body).toContain('Starbucks');
    expect(body).toContain('Tus hábitos hormiga');
    expect(root.querySelector('pp-bar-chart')).not.toBeNull();
    expect(root.querySelector('pp-donut-chart svg')).not.toBeNull();
  });

  it('hides the currency switcher with a single currency', async () => {
    const { add, render } = await setup();
    await add('Café', 450);
    expect(render().root.querySelector('pp-currency-switcher')).toBeNull();
  });

  it('switches currency without adding them and says why USD is not classified as ant', async () => {
    const { add, render } = await setup();
    await add('Café', 450);
    await add('Uber', 1200, 'USD');
    const { fixture, root } = render();
    fixture.detectChanges();

    expect(root.querySelector('pp-currency-switcher')).not.toBeNull();
    expect(text(root)).toContain('S/ 4.50');
    expect(text(root)).not.toContain('USD 12.00');

    const usd = Array.from(root.querySelectorAll<HTMLButtonElement>('pp-currency-switcher button')).find((b) =>
      text(b).includes('USD'),
    )!;
    usd.click();
    fixture.detectChanges();

    expect(text(root)).toContain('USD 12.00');
    expect(text(root)).toContain('no se clasifican como hormiga');
    expect(text(root)).not.toContain('Tus hábitos hormiga');
  });

  it('shows the detail of a tapped bar', async () => {
    const { add, render } = await setup();
    await add('Café', 450);
    const { fixture, root } = render();
    fixture.detectChanges();

    expect(text(root.querySelector('pp-bar-chart')!)).toContain('Toca una barra');
    const bars = root.querySelectorAll<HTMLButtonElement>('pp-bar-chart button');
    const withSpending = Array.from(bars).find((b) => /S\/\s4\.50/.test(b.getAttribute('aria-label') ?? ''))!;
    withSpending.click();
    fixture.detectChanges();
    expect(text(root.querySelector('pp-bar-chart p')!)).toContain('S/ 4.50');
  });

  it('moves between periods and stops at the current one', async () => {
    const { add, render } = await setup();
    await add('Café', 450);
    const { fixture, root } = render();
    fixture.detectChanges();

    expect(root.querySelector('button[aria-label="Período siguiente"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('button[aria-label="Período anterior"]')!.click();
    fixture.detectChanges();
    expect(text(root)).toContain('Sin gastos en este período');
    expect(root.querySelector('button[aria-label="Período siguiente"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('button[aria-label="Período siguiente"]')!.click();
    fixture.detectChanges();
    expect(text(root)).toContain('Total gastado');
  });

  it('changes the period kind', async () => {
    const { add, render } = await setup();
    await add('Café', 450);
    const { fixture, root } = render();
    fixture.detectChanges();

    const week = Array.from(root.querySelectorAll<HTMLButtonElement>('pp-segmented-control button')).find((b) =>
      text(b).includes('Semana'),
    )!;
    week.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('pp-bar-chart button')).toHaveLength(7);
  });
});

describe('Weekly budgets in InsightsPage', () => {
  const week = (root: HTMLElement) => root.querySelector('[aria-label="Presupuesto semanal"]');
  const amounts = (row: Element) => Array.from(row.querySelectorAll('dt, dd'), text);
  const penCap = Money.of(150, currency('PEN'));
  const usdCap = Money.of(40, currency('USD'));

  it('includes both boundaries and all expense types, without mixing currencies or following analytics controls', async () => {
    const { add, render, setBudgets } = await setup(new Date(2026, 10, 1, 12));
    await setBudgets(penCap, usdCap);
    await add('Domingo anterior', 9000, 'PEN', undefined, new Date(2026, 9, 25, 23, 59));
    await add('Café', 500, 'PEN', undefined, new Date(2026, 9, 26));
    await add('Pasaje', 1200, 'PEN', undefined, new Date(2026, 9, 27, 12), 'Transporte');
    await add('Cena', 8300, 'PEN', undefined, new Date(2026, 10, 1, 23, 59));
    await add('Compras', 4700, 'USD');
    await add('Gasto sin tope', 600, 'JPY');
    await add('Lunes siguiente', 8000, 'PEN', undefined, new Date(2026, 10, 2));
    const { fixture, root } = render();

    const section = week(root)!;
    expect(section).not.toBeNull();
    expect(text(section.querySelector('h2')!)).toBe('Presupuesto semanal');
    expect(text(section)).toMatch(/Lunes a domingo · 26 oct\.? – 1 nov\.?/);
    const rows = Array.from(section.querySelectorAll('article'));
    expect(rows.map((row) => text(row.querySelector('h3')!))).toEqual(['PEN', 'USD']);
    expect(amounts(rows[0])).toEqual(['Tope', 'S/ 150.00', 'Gastado', 'S/ 100.00', 'Te queda', 'S/ 50.00']);
    expect(amounts(rows[1])).toEqual(['Tope', 'USD 40.00', 'Gastado', 'USD 47.00', 'Te pasaste por', 'USD 7.00']);
    expect(rows.map((row, i) => {
      const progress = row.querySelector<HTMLProgressElement>(`progress[aria-label="Presupuesto usado en ${['PEN', 'USD'][i]}"]`)!;
      return [progress.value, progress.max];
    })).toEqual([[10_000, 15_000], [4000, 4000]]);

    const initialBudget = text(section);
    const buttons = (selector: string) => Array.from(root.querySelectorAll<HTMLButtonElement>(selector));
    buttons('pp-currency-switcher button').find((button) => text(button) === 'USD')!.click();
    fixture.detectChanges();
    expect(text(root.querySelector('[aria-label="Gastos hormiga"]')!)).toContain('no se clasifican como hormiga');
    root.querySelector<HTMLButtonElement>('button[aria-label="Período anterior"]')!.click();
    fixture.detectChanges();
    expect(text(week(root)!)).toBe(initialBudget);
    buttons('pp-segmented-control button').find((button) => text(button) === 'Semana')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('pp-bar-chart button')).toHaveLength(7);
    expect(text(week(root)!)).toBe(initialBudget);
  });

  it('shows zero remaining at the cap and updates when an active expense or cap is removed', async () => {
    const { add, expenses, render, setBudgets } = await setup(new Date(2026, 9, 30, 12));
    await setBudgets(penCap);
    const id = await add('Mercado', 15_000);
    const { fixture, root } = render();

    expect(week(root)).not.toBeNull();
    expect(amounts(week(root)!)).toEqual(['Tope', 'S/ 150.00', 'Gastado', 'S/ 150.00', 'Te queda', 'S/ 0.00']);

    expect((await expenses.remove(id)).ok).toBe(true);
    fixture.detectChanges();
    expect(amounts(week(root)!)).toEqual(['Tope', 'S/ 150.00', 'Gastado', 'S/ 0.00', 'Te queda', 'S/ 150.00']);
    expect(text(root)).toContain('Sin gastos en este período');

    await setBudgets();
    fixture.detectChanges();
    expect(week(root)).toBeNull();
  });

  it('moves to the new local week when the live clock refreshes', async () => {
    const { add, clock, render, setBudgets } = await setup(new Date(2026, 10, 1, 23, 59));
    await setBudgets(penCap);
    await add('Gasto del domingo', 2000);
    const { fixture, root } = render();
    expect(week(root)).not.toBeNull();
    expect(amounts(week(root)!)).toEqual(['Tope', 'S/ 150.00', 'Gastado', 'S/ 20.00', 'Te queda', 'S/ 130.00']);

    clock.set(new Date(2026, 10, 2));
    TestBed.inject(LiveClock).refresh();
    fixture.detectChanges();
    expect(text(week(root)!)).toMatch(/Lunes a domingo · 2 nov\.? – 8 nov\.?/);
    expect(amounts(week(root)!)).toEqual(['Tope', 'S/ 150.00', 'Gastado', 'S/ 0.00', 'Te queda', 'S/ 150.00']);
    expect(text(root.querySelector('[aria-label="Total del período"]')!)).toContain('S/ 20.00');
  });
});
