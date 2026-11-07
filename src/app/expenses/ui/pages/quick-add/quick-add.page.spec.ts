import { ApplicationInitStatus } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideSettings } from '@pp/settings';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpenseDraftStore } from '../../../application/expense-draft.store';
import { ExpensesStore } from '../../../application/expenses.store';
import { provideExpenses } from '../../../expenses.providers';
import { QuickAddPage } from './quick-add.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup(): Promise<ComponentFixture<QuickAddPage>> {
  localStorage.removeItem('pp-last-method');
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
    expect(body).not.toContain('Cuéntame');
    expect(body).toContain('Ingresa un monto mayor a cero.');
    expect(body).toContain('Elige una categoría.');
    expect(body).toContain('Elige cómo pagaste.');
    expect(TestBed.inject(ExpensesStore).all()).toHaveLength(0);
  });

  it('saves an expense in a few taps, updates today totals, resets the form and offers undo inline', async () => {
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

    fixture.detectChanges();
    expect(text(root)).toContain('Guardado');
    const undo = Array.from(root.querySelectorAll('button')).find((b) => text(b) === 'Deshacer')!;
    undo.click();
    await vi.waitFor(() => expect(store.all()).toHaveLength(0));
    fixture.detectChanges();
    expect(text(root)).not.toContain('Deshacer');
  });

  it('stops the spinner and shows a message when saving throws unexpectedly', async () => {
    const fixture = await setup();
    const root = el(fixture);
    vi.spyOn(TestBed.inject(ExpensesStore), 'add').mockRejectedValue(new Error('boom'));

    type(root, 'pp-amount-input input', '4.50');
    type(root, 'pp-text-field input', 'Café');
    fixture.detectChanges();
    chip(root, 'pp-category-picker', 'Café').click();
    chip(root, 'pp-method-picker', 'Yape').click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text(root)).toContain('No se pudo guardar');
    });
    expect(root.querySelector('pp-button button[type="submit"]')!.getAttribute('aria-busy')).toBe('false');
    expect(root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.disabled).toBe(false);
  });

  it('keeps an unsaved entry when the user leaves the page and comes back', async () => {
    const first = await setup();
    const root = el(first);
    type(root, 'pp-amount-input input', '4.50');
    type(root, 'pp-text-field input', 'Café');
    first.detectChanges();
    chip(root, 'pp-category-picker', 'Café').click();
    chip(root, 'pp-method-picker', 'Yape').click();
    first.detectChanges();
    first.destroy();

    const second = TestBed.createComponent(QuickAddPage);
    await vi.waitFor(() => {
      second.detectChanges();
      expect(el(second).querySelector<HTMLInputElement>('pp-text-field input')!.value).toBe('Café');
    });
    const back = el(second);
    expect(back.querySelector<HTMLInputElement>('pp-amount-input input')!.value).toContain('4.5');
    expect(chip(back, 'pp-category-picker', 'Café').getAttribute('aria-pressed')).toBe('true');
    expect(chip(back, 'pp-method-picker', 'Yape').getAttribute('aria-pressed')).toBe('true');
  });

  it('starts blank again once the entry is saved', async () => {
    const first = await setup();
    const root = el(first);
    type(root, 'pp-amount-input input', '4.50');
    type(root, 'pp-text-field input', 'Café');
    first.detectChanges();
    chip(root, 'pp-category-picker', 'Café').click();
    chip(root, 'pp-method-picker', 'Yape').click();
    first.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();
    await vi.waitFor(() => expect(TestBed.inject(ExpensesStore).all()).toHaveLength(1));
    await vi.waitFor(() => {
      first.detectChanges();
      expect(TestBed.inject(ExpenseDraftStore).current()).toBeNull();
    });
    first.destroy();

    const second = TestBed.createComponent(QuickAddPage);
    second.detectChanges();
    expect(el(second).querySelector<HTMLInputElement>('pp-text-field input')!.value).toBe('');
  });

  it('shows every category as a tile', async () => {
    const fixture = await setup();
    const tiles = el(fixture).querySelectorAll('pp-category-picker button');
    expect(tiles.length).toBe(9);
    expect(text(tiles[0])).toBe('Café');
  });

  it('takes the confirmation away as soon as a new entry starts', async () => {
    const fixture = await setup();
    const root = el(fixture);
    type(root, 'pp-amount-input input', '3');
    fixture.detectChanges();
    chip(root, 'pp-category-picker', 'Snacks').click();
    chip(root, 'pp-method-picker', 'Efectivo').click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text(root)).toContain('Guardado');
    });

    type(root, 'pp-amount-input input', '5');
    fixture.detectChanges();
    expect(text(root)).not.toContain('Guardado');
    expect(text(root)).toContain('Guardar gasto');
  });

  it('keeps the payment method after saving and preselects it next time', async () => {
    const first = await setup();
    const root = el(first);
    type(root, 'pp-amount-input input', '4.50');
    type(root, 'pp-text-field input', 'Café');
    first.detectChanges();
    chip(root, 'pp-category-picker', 'Café').click();
    chip(root, 'pp-method-picker', 'Yape').click();
    first.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();
    await vi.waitFor(() => expect(TestBed.inject(ExpensesStore).all()).toHaveLength(1));
    await vi.waitFor(() => {
      first.detectChanges();
      expect(root.querySelector<HTMLInputElement>('pp-amount-input input')!.value).toBe('');
    });
    expect(chip(root, 'pp-method-picker', 'Yape').getAttribute('aria-pressed')).toBe('true');
    first.destroy();

    const second = TestBed.createComponent(QuickAddPage);
    second.detectChanges();
    await vi.waitFor(() => {
      second.detectChanges();
      expect(chip(el(second), 'pp-method-picker', 'Yape').getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('hides place, date and note until asked for', async () => {
    const fixture = await setup();
    const root = el(fixture);
    expect(text(root)).not.toContain('Dónde');
    const toggle = Array.from(root.querySelectorAll('button')).find((b) => text(b).includes('Más detalles'))!;
    toggle.click();
    fixture.detectChanges();
    expect(text(root)).toContain('Dónde');
    expect(text(root)).toContain('Nota');
    expect(text(root)).toContain('Menos detalles');
  });

  it('saves without a name, using the category name', async () => {
    const fixture = await setup();
    const root = el(fixture);
    const store = TestBed.inject(ExpensesStore);

    type(root, 'pp-amount-input input', '3');
    fixture.detectChanges();
    chip(root, 'pp-category-picker', 'Snacks').click();
    chip(root, 'pp-method-picker', 'Efectivo').click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();

    await vi.waitFor(() => expect(store.all()).toHaveLength(1));
    expect(store.all()[0].what).toBe('Snacks');
  });
});
