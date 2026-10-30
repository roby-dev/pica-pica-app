import { TestBed } from '@angular/core/testing';
import { BarChart, type BarPoint } from './bar-chart/bar-chart';
import { DonutChart, type DonutSlice } from './donut-chart/donut-chart';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('BarChart', () => {
  const series: readonly BarPoint[] = [
    { key: 'a', label: 'lunes', tick: 'L', value: 100 },
    { key: 'b', label: 'martes', tick: 'M', value: 50 },
    { key: 'c', label: 'miércoles', tick: 'X', value: 0 },
  ];

  function render() {
    const fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('formatValue', (n: number) => `S/ ${n}`);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, bars: () => Array.from(root.querySelectorAll<HTMLButtonElement>('button')) };
  }

  it('scales bars to the largest value and keeps a sliver for zero', () => {
    const { root } = render();
    const heights = Array.from(root.querySelectorAll<HTMLElement>('button > span')).map((s) => s.style.height);
    expect(heights).toEqual(['100%', '50%', '2%']);
  });

  it('selects a bar on tap, reads it out, and unselects on a second tap', () => {
    const { fixture, root, bars } = render();
    bars()[1].click();
    fixture.detectChanges();
    expect(text(root.querySelector('p')!)).toContain('martes');
    expect(text(root.querySelector('p')!)).toContain('S/ 50');
    expect(bars()[1].getAttribute('aria-pressed')).toBe('true');

    bars()[1].click();
    fixture.detectChanges();
    expect(text(root.querySelector('p')!)).toContain('Toca una barra');
  });

  it('gives every bar an accessible name with its value', () => {
    const { bars } = render();
    expect(bars()[0].getAttribute('aria-label')).toBe('lunes: S/ 100');
  });

  it('does not divide by zero when everything is empty', () => {
    const fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('series', [{ key: 'a', label: 'x', value: 0 }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button > span')!.style.height).toBe('2%');
  });
});

describe('DonutChart', () => {
  const slices: readonly DonutSlice[] = [
    { key: 'food', label: 'Comida', value: 300, color: 'red', valueText: 'S/ 3.00' },
    { key: 'ride', label: 'Transporte', value: 100, color: 'blue', valueText: 'S/ 1.00' },
    { key: 'none', label: 'Vacía', value: 0, color: 'gray', valueText: 'S/ 0.00' },
  ];

  it('draws one arc per slice with spending and lists them with their share', () => {
    const fixture = TestBed.createComponent(DonutChart);
    fixture.componentRef.setInput('slices', slices);
    fixture.componentRef.setInput('centerLabel', 'Total S/ 4.00');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('svg circle')).toHaveLength(3); // track + two arcs
    expect(text(root)).toContain('75%');
    expect(text(root)).toContain('25%');
    expect(text(root)).not.toContain('Vacía');
    expect(text(root)).toContain('Total S/ 4.00');
  });

  it('shows the picked slice in the middle', () => {
    const fixture = TestBed.createComponent(DonutChart);
    fixture.componentRef.setInput('slices', slices);
    fixture.componentRef.setInput('centerLabel', 'Total S/ 4.00');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    root.querySelectorAll<HTMLButtonElement>('li button')[1].click();
    fixture.detectChanges();
    expect(text(root.querySelector('.absolute')!)).toContain('Transporte');
    expect(text(root.querySelector('.absolute')!)).not.toContain('Total S/ 4.00');
  });

  it('keeps a lone slice as a full ring', () => {
    const fixture = TestBed.createComponent(DonutChart);
    fixture.componentRef.setInput('slices', [slices[0]]);
    fixture.detectChanges();
    const arc = (fixture.nativeElement as HTMLElement).querySelectorAll('svg circle')[1];
    expect(arc.getAttribute('stroke-dasharray')).toBe('100 0');
  });
});
