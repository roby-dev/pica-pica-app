import { ApplicationInitStatus } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CatalogStore, ExpensesStore, provideExpenses } from '@pp/expenses';
import { provideSettings } from '@pp/settings';
import { currency, toIsoWithOffset } from '@pp/shared/kernel';
import { provideInsights } from '../../../insights.providers';
import { InsightsPage } from './insights.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

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
  const add = async (what: string, amountMinor: number, code = 'PEN', place?: string) => {
    const result = await expenses.add({
      what,
      amountMinor,
      currency: currency(code),
      categoryId: catalog.activeCategories()[0].id,
      paymentMethodId: catalog.activeMethods()[0].id,
      place,
      occurredAt: toIsoWithOffset(new Date()),
    });
    if (!result.ok) throw result.error;
  };
  const render = (): { fixture: ComponentFixture<InsightsPage>; root: HTMLElement } => {
    const fixture = TestBed.createComponent(InsightsPage);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };
  return { add, render };
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
