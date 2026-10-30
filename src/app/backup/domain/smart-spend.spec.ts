import { describe, expect, it } from 'vitest';
import { parseSmartSpend, SmartSpendFormatError } from './smart-spend';

const file = JSON.stringify([
  {
    uuid: 'l1',
    titulo: ' Mercado ',
    fecha: '2025-06-22T10:44:53.388368',
    detalles: [
      { uuid: 'a', nombre: 'Pollo', precio: 26.0, fecha: '2026-05-17T03:57:11.358504' },
      { uuid: 'b', nombre: 'Cebolla', precio: 3.2, fecha: '2026-05-17T03:57:25.420267' },
      { uuid: 'c', nombre: 'Sin precio', precio: 0, fecha: '2026-05-17T03:58:00.000000' },
    ],
  },
]);

describe('parseSmartSpend', () => {
  it('turns each priced item into one expense draft with Lima time', () => {
    const result = parseSmartSpend(file);
    expect(result.ok && result.value.items).toEqual([
      { id: 'a', what: 'Pollo', amountMinor: 2600, place: 'Mercado', occurredAt: '2026-05-17T03:57:11-05:00' },
      { id: 'b', what: 'Cebolla', amountMinor: 320, place: 'Mercado', occurredAt: '2026-05-17T03:57:25-05:00' },
    ]);
  });

  it('counts items without a price as skipped', () => {
    const result = parseSmartSpend(file);
    expect(result.ok && result.value.skipped).toBe(1);
  });

  it.each(['not json', '{"a":1}', '[{"titulo":"x"}]', '[{"titulo":"x","detalles":[{"uuid":"a"}]}]'])(
    'rejects %s',
    (text) => {
      const result = parseSmartSpend(text);
      expect(!result.ok && result.error).toBeInstanceOf(SmartSpendFormatError);
    },
  );
});
