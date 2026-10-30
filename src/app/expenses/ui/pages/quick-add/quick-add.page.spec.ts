import { ApplicationInitStatus } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideSettings } from '@pp/settings';
import { ToastService } from '@pp/shared/ui';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpensesStore } from '../../../application/expenses.store';
import { provideExpenses } from '../../../expenses.providers';
import { QuickAddPage } from './quick-add.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup(): Promise<ComponentFixture<QuickAddPage>> {
  TestBed.configureTestingModule({
    providers: [provideSettings({ persistence: 'memory' }), provideExpenses({ persistence: 'memory' })],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const fixture = TestBed.createComponent(QuickAddPage);
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(catalog.ready()).toBe(true);
    expect(catalog.activeCategories().length).toBeGreaterThan(0);
  });
  fixture.detectChanges();
  return fixture;
}

const el = (fixture: ComponentFixture<unknown>) => fixture.nativeElement as HTMLElement;

function type(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function chip(root: HTMLElement, scope: string, label: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll<HTMLButtonElement>(`${scope} button`)).find((b) =>
    text(b).includes(label),
  );
  if (!found) throw new Error(`chip "${label}" not found`);
  return found;
}

describe('QuickAddPage', () => {
  it('shows validation messages and saves nothing when the form is incomplete', async () => {
    const fixture = await setup();
    el(fixture).querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();
    fixture.detectChanges();

    const body = text(el(fixture));
    expect(body).toContain('Cuéntame qué compraste.');
    expect(body).toContain('Ingresa un monto mayor a cero.');
    expect(body).toContain('Elige una categoría.');
    expect(body).toContain('Elige cómo pagaste.');
    expect(TestBed.inject(ExpensesStore).all()).toHaveLength(0);
  });

  it('saves an expense in a few taps, updates today totals, resets the form and offers undo', async () => {
    const fixture = await setup();
    const root = el(fixture);
    const store = TestBed.inject(ExpensesStore);

    type(root, 'pp-amount-input input', '4.50');
    type(root, 'pp-text-field input', 'Café');
    fixture.detectChanges();
    chip(root, 'pp-category-picker', 'Café').click();
    chip(root, 'pp-method-picker', 'Yape').click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();

    await vi.waitFor(() => expect(store.all()).toHaveLength(1));
    fixture.detectChanges();

    const saved = store.all()[0];
    expect(saved.what).toBe('Café');
    expect(saved.amount).toEqual({ amountMinor: 450, currency: 'PEN' });
    expect(text(root)).toContain('S/');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector<HTMLInputElement>('pp-amount-input input')!.value).toBe('');
    });

    const toast = TestBed.inject(ToastService).current();
    expect(toast?.message).toBe('Gasto guardado');
    toast!.onAction!();
    await vi.waitFor(() => expect(store.all()).toHaveLength(0));
  });
});
