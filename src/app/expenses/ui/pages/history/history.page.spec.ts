import { ApplicationInitStatus } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideSettings } from '@pp/settings';
import { toIsoWithOffset } from '@pp/shared/kernel';
import { ToastService } from '@pp/shared/ui';
import { CatalogStore } from '../../../application/catalog.store';
import { ExpensesStore } from '../../../application/expenses.store';
import { provideExpenses } from '../../../expenses.providers';
import { HistoryPage } from './history.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
/** The list only: category filter chips repeat names like "Café". */
const list = (root: HTMLElement) => text(root.querySelector('pp-expense-list')!);

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideSettings({ persistence: 'memory' }),
      provideExpenses({ persistence: 'memory' }),
    ],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(catalog.activeCategories().length).toBeGreaterThan(0));
  const store = TestBed.inject(ExpensesStore);
  const [category] = catalog.activeCategories();
  const [method] = catalog.activeMethods();
  const add = (what: string, amountMinor: number, place?: string) =>
    store.add({
      what,
      amountMinor,
      categoryId: category.id,
      paymentMethodId: method.id,
      place,
      occurredAt: toIsoWithOffset(new Date()),
    });
  await add('Café', 450, 'Bodega');
  await add('Pasaje', 250);
  const fixture: ComponentFixture<HistoryPage> = TestBed.createComponent(HistoryPage);
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toContain('Café');
  });
  return { fixture, store, root: fixture.nativeElement as HTMLElement };
}

describe('HistoryPage', () => {
  it('lists expenses under today with the day total', async () => {
    const { root } = await setup();
    expect(text(root)).toContain('Hoy');
    expect(text(root)).toContain('Café');
    expect(text(root)).toContain('Pasaje');
    expect(text(root)).toContain('S/');
  });

  it('filters by search text and explains an empty result', async () => {
    const { fixture, root } = await setup();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'pasaje';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(list(root)).toContain('Pasaje');
    expect(list(root)).not.toContain('Café');

    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(text(root)).toContain('Nada coincide');
  });

  it('deletes with an undo toast that brings the expense back', async () => {
    const { fixture, store, root } = await setup();
    root.querySelector<HTMLButtonElement>('button[aria-label="Eliminar Café"]')!.click();
    await vi.waitFor(() => expect(store.all()).toHaveLength(1));
    fixture.detectChanges();
    expect(list(root)).not.toContain('Café');

    await vi.waitFor(() => expect(TestBed.inject(ToastService).current()?.actionLabel).toBe('Deshacer'));
    TestBed.inject(ToastService).current()!.onAction!();
    await vi.waitFor(() => expect(store.all()).toHaveLength(2));
  });

  it('opens the edit page for the tapped expense', async () => {
    const { store, root } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    root.querySelector<HTMLButtonElement>('button[aria-label="Editar Café"]')!.click();
    expect(navigate).toHaveBeenCalledWith(['/history', store.all().find((e) => e.what === 'Café')!.id]);
  });
});
