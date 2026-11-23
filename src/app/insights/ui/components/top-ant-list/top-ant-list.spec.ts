import { TestBed } from '@angular/core/testing';
import { currency } from '@pp/shared/kernel';
import { TopAntList, type TopAntRow } from './top-ant-list';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const PEN = currency('PEN');

function render(items: readonly TopAntRow[]): HTMLElement {
  const fixture = TestBed.createComponent(TopAntList);
  fixture.componentRef.setInput('items', items);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const row = (yearly: TopAntRow['yearly']): TopAntRow => ({
  key: 'cafe|',
  what: 'Café',
  place: 'Tambo',
  count: 18,
  total: { amountMinor: 16_200, currency: PEN },
  yearly,
});

describe('TopAntList', () => {
  it('shows what the habit costs in a year', () => {
    const body = text(render([row({ amountMinor: 194_400, currency: PEN })]));

    expect(body).toContain('18 veces · Tambo');
    expect(body).toContain('S/ 162.00');
    expect(body).toContain('S/ 1,944.00 al año');
  });

  it('leaves the yearly cost out when there is no reliable pace yet', () => {
    expect(text(render([row(null)]))).not.toContain('al año');
  });
});
