import { currency } from '@pp/shared/kernel';
import type { CategoryId, PaymentMethodId } from './ids';
import type { OccurredAt } from './occurred-at';
import { rankPresets, type PresetSource } from './preset-ranking';

const at = (iso: string) => iso as OccurredAt;

const spend = (what: string, occurredAt: string, amountMinor = 500, place: string | null = null): PresetSource => ({
  what,
  amount: { amountMinor, currency: currency('PEN') },
  categoryId: 'cat-1' as CategoryId,
  paymentMethodId: 'pm-1' as PaymentMethodId,
  place: place as PresetSource['place'],
  occurredAt: at(occurredAt),
});

// Coffee on weekday mornings; beer at night, logged more recently.
const history = [
  spend('Cerveza', '2026-10-26T21:00:00-05:00'), // Monday night
  spend('Cerveza', '2026-10-24T22:00:00-05:00'), // Saturday night
  spend('Cerveza', '2026-10-23T21:30:00-05:00'), // Friday night
  spend('Café', '2026-10-21T08:10:00-05:00'), // Wednesday morning
  spend('Café', '2026-10-20T08:00:00-05:00'), // Tuesday morning
  spend('Café', '2026-10-19T08:20:00-05:00'), // Monday morning
];

describe('rankPresets', () => {
  it('puts the habit that matches the current hour and day type first, not just the latest one', () => {
    const names = rankPresets(history, at('2026-10-27T08:30:00-05:00')).map((p) => p.what);

    expect(names).toEqual(['Café', 'Cerveza']);
  });

  it('ranks the night habit first on a weekday night', () => {
    const names = rankPresets(history, at('2026-10-30T21:00:00-05:00')).map((p) => p.what);

    expect(names).toEqual(['Cerveza', 'Café']);
  });

  it('autofills from the latest occurrence of each name, whatever the input order', () => {
    const [preset] = rankPresets(
      [spend('Café', '2026-10-20T08:00:00-05:00', 700, 'Bodega'), spend('Café', '2026-10-26T08:00:00-05:00', 950, 'Starbucks')],
      at('2026-10-27T08:00:00-05:00'),
    );

    expect(preset).toEqual({
      what: 'Café',
      amountMinor: 950,
      currency: 'PEN',
      categoryId: 'cat-1',
      paymentMethodId: 'pm-1',
      place: 'Starbucks',
    });
  });

  it('treats names that differ only in case or spaces as one habit, shown as last typed', () => {
    const presets = rankPresets(
      [
        spend('café', '2026-10-24T08:00:00-05:00'),
        spend(' CAFÉ ', '2026-10-25T08:00:00-05:00'),
        spend('Café', '2026-10-26T08:00:00-05:00', 950),
        spend('Cafe', '2026-10-26T09:00:00-05:00'),
      ],
      at('2026-10-27T08:00:00-05:00'),
    );

    // Accents still matter, as in the insights habit counter.
    expect(presets.map((p) => p.what)).toEqual(['Café', 'Cafe']);
    expect(presets[0].amountMinor).toBe(950);
  });

  it('prefers the more frequent habit when the context is the same', () => {
    const names = rankPresets(
      [
        spend('Agua', '2026-10-26T12:00:00-05:00'),
        spend('Pasaje', '2026-10-25T12:00:00-05:00'),
        spend('Pasaje', '2026-10-24T12:00:00-05:00'),
        spend('Pasaje', '2026-10-23T12:00:00-05:00'),
      ],
      at('2026-10-27T12:00:00-05:00'),
    ).map((p) => p.what);

    expect(names).toEqual(['Pasaje', 'Agua']);
  });

  it('returns at most the requested number of presets and skips blank names', () => {
    const many = ['A', 'B', 'C', 'D', ''].map((name, i) => spend(name, `2026-10-2${i}T12:00:00-05:00`));

    expect(rankPresets(many, at('2026-10-27T12:00:00-05:00'), 3)).toHaveLength(3);
    expect(rankPresets(many, at('2026-10-27T12:00:00-05:00')).map((p) => p.what)).not.toContain('');
  });
});
