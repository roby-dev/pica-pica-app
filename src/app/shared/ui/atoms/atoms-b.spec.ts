import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_CURRENCY, Money, currency } from '@pp/shared/kernel';
import { AmountInput } from './amount-input/amount-input';
import { AmountText } from './amount-text/amount-text';
import { Chip } from './chip/chip';
import { TextField } from './text-field/text-field';
import { Toggle } from './toggle/toggle';

const root = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;
const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s/g, ' ').trim();

describe('AmountText', () => {
  it('formats money in es-PE', async () => {
    const fixture = TestBed.createComponent(AmountText);
    fixture.componentRef.setInput('money', Money.of(20, DEFAULT_CURRENCY));
    await fixture.whenStable();
    expect(text(root(fixture))).toBe('S/ 20.00');
  });

  it('prefixes a minus when signed and keeps other currencies intact', async () => {
    const fixture = TestBed.createComponent(AmountText);
    fixture.componentRef.setInput('money', Money.of(5.5, currency('USD')));
    fixture.componentRef.setInput('signed', true);
    await fixture.whenStable();
    expect(text(root(fixture))).toMatch(/^−.*5\.50$/);
  });
});

describe('Chip', () => {
  it('reflects selection and emits the toggled value', async () => {
    const fixture = TestBed.createComponent(Chip);
    fixture.componentRef.setInput('label', 'Café');
    await fixture.whenStable();
    const spy = vi.fn();
    fixture.componentInstance.toggled.subscribe(spy);
    const button = root(fixture).querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(text(button)).toContain('Café');
    button.click();
    expect(spy).toHaveBeenCalledWith(true);

    fixture.componentRef.setInput('selected', true);
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    expect(spy).toHaveBeenLastCalledWith(false);
  });
});

describe('TextField', () => {
  it('two-way binds the value and shows the error accessibly', async () => {
    @Component({
      imports: [TextField],
      template: `<pp-text-field label="Dónde" [(value)]="value" [error]="error()" />`,
    })
    class Host {
      readonly value = signal('');
      readonly error = signal<string | null>(null);
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = root(fixture).querySelector('input')!;
    input.value = 'Bodega Lola';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('Bodega Lola');

    fixture.componentInstance.error.set('Máximo 60 caracteres');
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(root(fixture).querySelector('[role="alert"]')!.textContent).toContain('Máximo 60');
    expect(input.className).toContain('text-base');
  });
});

describe('Toggle', () => {
  it('behaves as a switch', async () => {
    @Component({
      imports: [Toggle],
      template: `<pp-toggle label="Recordatorio" [(checked)]="on" />`,
    })
    class Host {
      readonly on = signal(false);
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const button = root(fixture).querySelector('button')!;
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-checked')).toBe('false');
    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });
});

describe('AmountInput', () => {
  @Component({
    imports: [AmountInput],
    template: `<pp-amount-input [currency]="currency" [(valueMinor)]="minor" (submitted)="submits = submits + 1" />`,
  })
  class Host {
    readonly currency = DEFAULT_CURRENCY;
    readonly minor = signal<number | null>(null);
    submits = 0;
  }

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('uses the decimal keypad and shows the currency symbol', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = root(fixture).querySelector('input')!;
    expect(input.getAttribute('inputmode')).toBe('decimal');
    expect(text(root(fixture))).toContain('S/');
  });

  it('emits minor units as the user types', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = root(fixture).querySelector('input')!;
    type(input, '20,50');
    expect(fixture.componentInstance.minor()).toBe(2050);
    type(input, '1,250.50');
    expect(fixture.componentInstance.minor()).toBe(125050);
    type(input, 'abc');
    expect(fixture.componentInstance.minor()).toBeNull();
  });

  it('shows a value set from outside and clears on null', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = root(fixture).querySelector('input')!;
    fixture.componentInstance.minor.set(850);
    await fixture.whenStable();
    expect(input.value).toBe('8.50');
    fixture.componentInstance.minor.set(null);
    await fixture.whenStable();
    expect(input.value).toBe('');
  });

  it('emits submitted on Enter', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    root(fixture)
      .querySelector('input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fixture.componentInstance.submits).toBe(1);
  });
});
