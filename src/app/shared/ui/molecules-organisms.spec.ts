import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Money, currency } from '@pp/shared/kernel';
import { AppHeader } from './organisms/app-header/app-header';
import { BottomSheet } from './organisms/bottom-sheet/bottom-sheet';
import { DateTimeField } from './molecules/date-time-field/date-time-field';
import { EmptyState } from './molecules/empty-state/empty-state';
import { SearchBar } from './molecules/search-bar/search-bar';
import { SegmentedControl } from './molecules/segmented-control/segmented-control';
import { StatCard } from './molecules/stat-card/stat-card';
import { TabBar } from './organisms/tab-bar/tab-bar';
import { Toast } from './molecules/toast/toast';
import { ToastService } from './molecules/toast/toast.service';

const root = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('SegmentedControl', () => {
  it('two-way binds the selected option', async () => {
    @Component({
      imports: [SegmentedControl],
      template: `<pp-segmented-control [options]="options" [(value)]="value" />`,
    })
    class Host {
      readonly options = [
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mes' },
      ];
      readonly value = signal('week');
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const radios = root(fixture).querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    radios[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('month');
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
  });
});

describe('StatCard', () => {
  it('shows the amount, trend and hint', async () => {
    const fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('label', 'Hoy');
    fixture.componentRef.setInput('money', Money.of(14.5, currency('PEN')));
    fixture.componentRef.setInput('trend', { deltaPct: 12.4, direction: 'up' });
    fixture.componentRef.setInput('hint', '3 gastos');
    await fixture.whenStable();
    const content = text(root(fixture)).replace(/\s/g, ' ');
    expect(content).toContain('Hoy');
    expect(content).toContain('S/ 14.50');
    expect(content).toContain('+12%');
    expect(content).toContain('3 gastos');
  });

  it('shows a dash when there is no amount', async () => {
    const fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('label', 'Semana');
    await fixture.whenStable();
    expect(text(root(fixture))).toContain('—');
  });
});

describe('EmptyState', () => {
  it('renders its copy and emits the action', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('icon', 'coin');
    fixture.componentRef.setInput('title', 'Sin gastos todavía');
    fixture.componentRef.setInput('message', 'Registra el primero.');
    fixture.componentRef.setInput('actionLabel', 'Agregar gasto');
    await fixture.whenStable();
    const spy = vi.fn();
    fixture.componentInstance.action.subscribe(spy);
    expect(text(root(fixture))).toContain('Sin gastos todavía');
    root(fixture).querySelector('button')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('omits the button without an action label', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('icon', 'coin');
    fixture.componentRef.setInput('title', 't');
    fixture.componentRef.setInput('message', 'm');
    await fixture.whenStable();
    expect(root(fixture).querySelector('button')).toBeNull();
  });
});

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the message and emits the action', async () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.componentRef.setInput('message', 'Gasto eliminado');
    fixture.componentRef.setInput('actionLabel', 'Deshacer');
    await fixture.whenStable();
    const spy = vi.fn();
    fixture.componentInstance.action.subscribe(spy);
    expect(text(root(fixture))).toContain('Gasto eliminado');
    root(fixture).querySelector('button')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dismisses itself after its duration', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Toast);
    fixture.componentRef.setInput('message', 'Guardado');
    fixture.componentRef.setInput('durationMs', 3000);
    const dismissed = vi.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2999);
    expect(dismissed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });
});

describe('ToastService', () => {
  it('keeps one toast at a time and can dismiss it', () => {
    const service = TestBed.inject(ToastService);
    service.show({ message: 'uno' });
    service.show({ message: 'dos' });
    expect(service.current()?.message).toBe('dos');
    service.dismiss();
    expect(service.current()).toBeNull();
  });
});

describe('SearchBar', () => {
  it('two-way binds the query and clears it', async () => {
    @Component({ imports: [SearchBar], template: `<pp-search-bar [(query)]="query" />` })
    class Host {
      readonly query = signal('');
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = root(fixture).querySelector('input')!;
    input.value = 'café';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.query()).toBe('café');

    root(fixture).querySelector<HTMLButtonElement>('button[aria-label="Borrar búsqueda"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.query()).toBe('');
  });
});

describe('DateTimeField', () => {
  const setup = async (value: string) => {
    @Component({ imports: [DateTimeField], template: `<pp-date-time-field [(value)]="value" />` })
    class Host {
      readonly value = signal(value);
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  };

  it('shows the value in local datetime-local format', async () => {
    const fixture = await setup('2026-10-30T08:42:00-05:00');
    const input = root(fixture).querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(input.value).getTime()).toBe(new Date('2026-10-30T08:42:00-05:00').getTime());
  });

  it('writes ISO with offset when a time is picked', async () => {
    const fixture = await setup('');
    const input = root(fixture).querySelector<HTMLInputElement>('input')!;
    input.value = '2026-10-29T21:15';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toMatch(/^2026-10-29T21:15:00[+-]\d{2}:\d{2}$/);
  });

  it('offers Ahora and Ayer shortcuts', async () => {
    const fixture = await setup('');
    const [now, yesterday] = Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('button'));
    now.click();
    const nowValue = new Date(fixture.componentInstance.value()).getTime();
    expect(Math.abs(nowValue - Date.now())).toBeLessThan(5000);
    yesterday.click();
    const diff = Date.now() - new Date(fixture.componentInstance.value()).getTime();
    expect(Math.abs(diff - 24 * 60 * 60 * 1000)).toBeLessThan(5000);
  });
});

describe('TabBar', () => {
  const items = [
    { path: 'add', label: 'Agregar', icon: 'plus' },
    { path: 'history', label: 'Historial', icon: 'list' },
  ] as const;

  it('renders one link per tab with its label', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TabBar);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    const links = root(fixture).querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(text(links[1])).toBe('Historial');
    expect(links[0].className).toContain('min-h-14');
  });

  it('slides away and leaves the tab order when hidden', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TabBar);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('hidden', true);
    await fixture.whenStable();
    const nav = root(fixture).querySelector('nav')!;
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(nav.querySelector('a')!.getAttribute('tabindex')).toBe('-1');
  });
});

describe('AppHeader', () => {
  it('shows title and subtitle, and the back button only when asked', async () => {
    const fixture = TestBed.createComponent(AppHeader);
    fixture.componentRef.setInput('title', 'Historial');
    fixture.componentRef.setInput('subtitle', 'Octubre');
    await fixture.whenStable();
    expect(text(root(fixture))).toContain('Historial');
    expect(root(fixture).querySelector('button')).toBeNull();

    fixture.componentRef.setInput('showBack', true);
    await fixture.whenStable();
    const spy = vi.fn();
    fixture.componentInstance.back.subscribe(spy);
    root(fixture).querySelector('button')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet', () => {
  beforeEach(() => {
    // jsdom does not implement the modal dialog API; model its open state.
    const proto = HTMLDialogElement.prototype;
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('opens and closes the native dialog from the open model', async () => {
    @Component({
      imports: [BottomSheet],
      template: `<pp-bottom-sheet title="Filtros" [(open)]="open">contenido</pp-bottom-sheet>`,
    })
    class Host {
      readonly open = signal(false);
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const dialog = root(fixture).querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(false);

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Filtros');

    root(fixture).querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('closes on Escape (cancel) instead of leaving the model out of sync', async () => {
    @Component({
      imports: [BottomSheet],
      template: `<pp-bottom-sheet title="Filtros" [(open)]="open" />`,
    })
    class Host {
      readonly open = signal(true);
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    root(fixture).querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});

describe('AppHeader layering', () => {
  it('stays flat (no glass) to keep blur layers under the iOS budget', async () => {
    const fixture = TestBed.createComponent(AppHeader);
    fixture.componentRef.setInput('title', 'Ajustes');
    await fixture.whenStable();
    expect(root(fixture).innerHTML).not.toContain('glass');
  });
});
