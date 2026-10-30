import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideExpenses } from '@pp/expenses';
import { provideInsights } from '@pp/insights';
import { provideSettings } from '@pp/settings';
import { ToastService } from '@pp/shared/ui';
import { routes } from '../../app.routes';
import { TAB_ITEMS } from '../navigation/tab-items';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function boot(url = '/') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideSettings({ persistence: 'memory' }),
      provideExpenses({ persistence: 'memory' }),
      provideInsights(),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  return harness;
}

describe('AppLayout and routes', () => {
  it('opens on the quick-add page', async () => {
    const harness = await boot('/');
    const root = harness.routeNativeElement!.ownerDocument.body;
    expect(TestBed.inject(Router).url).toBe('/add');
    expect(text(root)).toContain('Hoy');
    expect(text(root)).not.toContain('Registra un gasto hormiga');
  });

  it('renders the four tabs in order', async () => {
    const harness = await boot('/add');
    const links = Array.from(harness.routeNativeElement!.ownerDocument.querySelectorAll('pp-tab-bar a'));
    expect(links.map((a) => text(a))).toEqual(TAB_ITEMS.map((t) => t.label));
  });

  it.each([
    ['/history', 'Tus gastos por día'],
    ['/insights', 'Dónde se va tu plata'],
    ['/settings', 'Umbral y tema'],
  ])('lazy-loads %s', async (url, subtitle) => {
    const harness = await boot(url);
    expect(text(harness.routeNativeElement!.ownerDocument.body)).toContain(subtitle);
  });

  it('sends unknown URLs back to quick-add', async () => {
    await boot('/no-existe');
    expect(TestBed.inject(Router).url).toBe('/add');
  });

  it('shows a toast with its action and dismisses it', async () => {
    const harness = await boot('/add');
    const onAction = vi.fn();
    TestBed.inject(ToastService).show({ message: 'Gasto eliminado', actionLabel: 'Deshacer', onAction });
    harness.detectChanges();
    const body = harness.routeNativeElement!.ownerDocument.body;
    expect(text(body)).toContain('Gasto eliminado');
    body.querySelector<HTMLButtonElement>('pp-toast button')!.click();
    harness.detectChanges();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ToastService).current()).toBeNull();
  });
});


