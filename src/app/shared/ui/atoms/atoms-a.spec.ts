import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge/badge';
import { Button } from './button/button';
import { Divider } from './divider/divider';
import { GlassSurface } from './glass-surface/glass-surface';
import { IconButton } from './icon-button/icon-button';
import { Icon } from './icon/icon';
import { Skeleton } from './skeleton/skeleton';

const root = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

describe('GlassSurface', () => {
  it('applies the glass class per variant and projects content', async () => {
    @Component({
      imports: [GlassSurface],
      template: `<pp-glass-surface [variant]="variant()">hola</pp-glass-surface>`,
    })
    class Host {
      readonly variant = signal<'card' | 'bar'>('card');
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = root(fixture).querySelector('pp-glass-surface')!;
    expect(el.classList.contains('glass')).toBe(true);
    expect(el.textContent).toContain('hola');

    fixture.componentInstance.variant.set('bar');
    await fixture.whenStable();
    expect(el.classList.contains('glass-strong')).toBe(true);
  });
});

describe('Icon', () => {
  it('renders an aria-hidden svg with the icon path and size', async () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'plus');
    fixture.componentRef.setInput('size', 28);
    await fixture.whenStable();
    const svg = root(fixture).querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('28');
    expect(svg.querySelector('path')!.getAttribute('d')).toContain('M12 5v14');
  });
});

describe('Button', () => {
  const create = async (inputs: Record<string, unknown> = {}) => {
    const fixture = TestBed.createComponent(Button);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
    return fixture;
  };

  it('emits pressed on click', async () => {
    const fixture = await create();
    const spy = vi.fn();
    fixture.componentInstance.pressed.subscribe(spy);
    root(fixture).querySelector('button')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit when disabled or loading', async () => {
    for (const inputs of [{ disabled: true }, { loading: true }]) {
      const fixture = await create(inputs);
      const spy = vi.fn();
      fixture.componentInstance.pressed.subscribe(spy);
      const button = root(fixture).querySelector('button')!;
      button.click();
      expect(button.disabled).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('is at least 48px tall by class and marks busy state', async () => {
    const fixture = await create({ loading: true });
    const button = root(fixture).querySelector('button')!;
    expect(button.className).toContain('min-h-12');
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});

describe('IconButton', () => {
  it('uses the required label as accessible name and emits pressed', async () => {
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('icon', 'trash');
    fixture.componentRef.setInput('label', 'Eliminar gasto');
    await fixture.whenStable();
    const spy = vi.fn();
    fixture.componentInstance.pressed.subscribe(spy);
    const button = root(fixture).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Eliminar gasto');
    expect(button.className).toContain('size-11');
    button.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Divider', () => {
  it('is a separator and insets on demand', async () => {
    const fixture = TestBed.createComponent(Divider);
    await fixture.whenStable();
    const el = root(fixture);
    expect(el.getAttribute('role')).toBe('separator');
    expect(el.classList.contains('mx-4')).toBe(false);
    fixture.componentRef.setInput('inset', true);
    await fixture.whenStable();
    expect(el.classList.contains('mx-4')).toBe(true);
  });
});

describe('Skeleton', () => {
  it('renders the requested number of lines and announces busy once', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('lines', 3);
    await fixture.whenStable();
    const el = root(fixture);
    expect(el.querySelectorAll('span').length).toBe(3);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('renders at least one line', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('lines', 0);
    await fixture.whenStable();
    expect(root(fixture).querySelectorAll('span').length).toBe(1);
  });
});

describe('Badge', () => {
  it('shows its text with the tone styling', async () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('text', '+12%');
    fixture.componentRef.setInput('tone', 'up');
    await fixture.whenStable();
    const el = root(fixture);
    expect(el.textContent).toContain('+12%');
    expect(el.className).toContain('rounded-pill');
  });
});
