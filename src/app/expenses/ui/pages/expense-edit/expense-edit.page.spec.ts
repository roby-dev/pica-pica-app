import { Location } from '@angular/common';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSettings } from '@pp/settings';
import { toIsoWithOffset } from '@pp/shared/kernel';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpensesStore } from '../../../application/expenses.store';
import { provideExpenses } from '../../../expenses.providers';
import { ExpenseEditPage } from './expense-edit.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideSettings({ persistence: 'memory' }), provideExpenses({ persistence: 'memory' })],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(catalog.activeCategories().length).toBeGreaterThan(0));
  const store = TestBed.inject(ExpensesStore);
  const added = await store.add({
    what: 'Café',
    amountMinor: 450,
    categoryId: catalog.activeCategories()[0].id,
    paymentMethodId: catalog.activeMethods()[0].id,
    occurredAt: toIsoWithOffset(new Date()),
  });
  if (!added.ok) throw added.error;
  const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
  const fixture = TestBed.createComponent(ExpenseEditPage);
  fixture.componentRef.setInput('id', added.value.id);
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('pp-expense-form')).not.toBeNull();
  });
  return { fixture, store, back, id: added.value.id, root: fixture.nativeElement as HTMLElement };
}

describe('ExpenseEditPage', () => {
  it('prefills the form with the saved expense', async () => {
    const { fixture, root } = await setup();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector<HTMLInputElement>('pp-amount-input input')!.value).toBe('4.50');
    });
    expect(root.querySelector<HTMLInputElement>('pp-text-field input')!.value).toBe('Café');
    expect(text(root)).toContain('Guardar cambios');
  });

  it('saves changes through the store and goes back', async () => {
    const { fixture, store, back, id, root } = await setup();
    const what = root.querySelector<HTMLInputElement>('pp-text-field input')!;
    what.value = 'Café doble';
    what.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('pp-button button[type="submit"]')!.click();

    await vi.waitFor(() => expect(back).toHaveBeenCalled());
    expect(store.getById(id)?.what).toBe('Café doble');
    expect(store.all()).toHaveLength(1);
  });

  it('deletes the expense and goes back', async () => {
    const { store, back, root } = await setup();
    const del = Array.from(root.querySelectorAll<HTMLButtonElement>('pp-button button')).find((b) =>
      text(b).includes('Eliminar gasto'),
    )!;
    del.click();
    await vi.waitFor(() => expect(back).toHaveBeenCalled());
    expect(store.all()).toHaveLength(0);
  });

  it('says so when the expense does not exist', async () => {
    const { fixture } = await setup();
    fixture.componentRef.setInput('id', 'does-not-exist');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text(fixture.nativeElement)).toContain('No encontramos este gasto');
    });
  });
});
