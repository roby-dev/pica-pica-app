import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastService } from '@pp/shared/ui';
import { provideSettings } from '../../../settings.providers';
import { SettingsStore } from '../../../application/settings.store';
import { SettingsPage } from './settings.page';

async function setup() {
  TestBed.configureTestingModule({ providers: [provideSettings({ persistence: 'memory' }), provideRouter([])] });
  const fixture = TestBed.createComponent(SettingsPage);
  const store = TestBed.inject(SettingsStore);
  await vi.waitFor(() => expect(store.ready()).toBe(true));
  fixture.detectChanges();
  return { fixture, store, el: fixture.nativeElement as HTMLElement };
}

const button = (el: Element, label: string) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;

function enter(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('SettingsPage', () => {
  it('sets, edits and removes weekly caps independently by currency', async () => {
    const { fixture, store, el } = await setup();
    const section = el.querySelector('[aria-label="Presupuesto semanal"]');
    expect(section).not.toBeNull();
    const select = section!.querySelector('select')!;
    const input = section!.querySelector('input')!;
    const selectCurrency = (code: string) => {
      select.value = code;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const save = async (inputText: string, expected: string) => {
      enter(input, inputText);
      fixture.detectChanges();
      button(section!, 'Guardar tope').click();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(section!.querySelector('ul')?.textContent).toContain(expected);
      });
    };

    expect(select.value).toBe('PEN');
    for (const invalid of ['0', '-10', '1.234']) {
      enter(input, invalid);
      fixture.detectChanges();
      expect(button(section!, 'Guardar tope').disabled).toBe(true);
    }
    await save('150', '150.00');
    selectCurrency('USD');
    expect(input.value).toBe('');
    await save('40', '40.00');
    selectCurrency('PEN');
    expect(input.value).toBe('150.00');
    await save('175,25', '175.25');
    button(section!, 'Quitar tope').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(section!.querySelector('ul')?.textContent).not.toContain('PEN');
    });
    selectCurrency('JPY');
    await save('500', '500');
    expect(store.settings()).toMatchObject({
      weeklyBudgets: [{ currency: 'USD', amountMinor: 4000 }, { currency: 'JPY', amountMinor: 500 }],
      defaultCurrency: 'PEN', antExpenseThreshold: { currency: 'PEN', amountMinor: 2000 },
    });
  });

  it('shows the saved threshold and saves a new one', async () => {
    const { fixture, store, el } = await setup();
    const input = el.querySelector('pp-amount-input input') as HTMLInputElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(input.value).toContain('20');
    });
    input.value = '35.50';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar umbral')) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(store.antExpenseThreshold().amountMinor).toBe(3550));
    expect(TestBed.inject(ToastService).current()?.message).toBe('Umbral guardado');
  });

  it('changes the theme', async () => {
    const { fixture, store, el } = await setup();
    (Array.from(el.querySelectorAll('[role=radio]')).find((b) => b.textContent?.includes('Claro')) as HTMLButtonElement).click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(store.theme()).toBe('light'));
  });
});
