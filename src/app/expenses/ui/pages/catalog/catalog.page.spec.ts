import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSettings } from '@pp/settings';
import { CatalogStore } from '../../../application/catalog.store';
import { provideExpenses } from '../../../expenses.providers';
import { CatalogPage } from './catalog.page';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideSettings({ persistence: 'memory' }), provideExpenses({ persistence: 'memory' })],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  const catalog = TestBed.inject(CatalogStore);
  await vi.waitFor(() => expect(catalog.activeMethods().length).toBeGreaterThan(0));
  const fixture = TestBed.createComponent(CatalogPage);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const buttonNamed = (label: string) =>
    [...root.querySelectorAll('button')].find((b) => text(b) === label || b.getAttribute('aria-label') === label);
  return { fixture, catalog, root, buttonNamed };
}

describe('CatalogPage adding a payment method', () => {
  it('adds a card with the chosen type and shows it in the list', async () => {
    const { fixture, catalog, root, buttonNamed } = await setup();

    buttonNamed('Agregar método')!.click();
    fixture.detectChanges();
    const input = root.querySelector<HTMLInputElement>('[data-testid="new-method"] input')!;
    input.value = 'Visa BCP';
    input.dispatchEvent(new Event('input'));
    // Scoped: the existing "Débito" method row is also a button with that text.
    [...root.querySelectorAll<HTMLButtonElement>('[data-testid="new-method"] button')].find((b) => text(b) === 'Débito')!.click();
    fixture.detectChanges();
    buttonNamed('Agregar')!.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('[data-testid="new-method"]')).toBeNull();
    });
    expect(catalog.activeMethods().at(-1)).toMatchObject({ name: 'Visa BCP', kind: 'debit' });
    expect(text(root)).toContain('Visa BCP');
  });

  it('keeps the form open with a message when the name already exists', async () => {
    const { fixture, catalog, root, buttonNamed } = await setup();
    const before = catalog.methods().length;

    buttonNamed('Agregar método')!.click();
    fixture.detectChanges();
    const input = root.querySelector<HTMLInputElement>('[data-testid="new-method"] input')!;
    input.value = 'Efectivo';
    input.dispatchEvent(new Event('input'));
    buttonNamed('Agregar')!.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text(root)).toContain('Ese nombre ya existe');
    });
    expect(catalog.methods()).toHaveLength(before);
  });
});
