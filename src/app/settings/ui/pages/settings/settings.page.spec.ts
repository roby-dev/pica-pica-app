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

describe('SettingsPage', () => {
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
