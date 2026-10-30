import { currency, DEFAULT_CURRENCY, minorExponent, parseCurrency } from './currency';
import { addTo, emptyTotals, sumMoney, toMoneyList, totalFor } from './currency-totals';
import { CurrencyMismatchError, InvalidMoneyError, Money } from './money';

const PEN = DEFAULT_CURRENCY;
const USD = currency('USD');

describe('Money', () => {
  it('stores S/ 20.00 as 2000 minor units', () => {
    expect(Money.of(20, PEN).amountMinor).toBe(2000);
  });

  it('avoids float drift when converting to minor units', () => {
    expect(Money.of(1.005, PEN).amountMinor).toBe(101);
    expect(Money.of(8.5, PEN).amountMinor).toBe(850);
  });

  it('respects currencies without decimals', () => {
    expect(minorExponent(currency('JPY'))).toBe(0);
    expect(Money.of(500, currency('JPY')).amountMinor).toBe(500);
  });

  it('rejects non-finite and unsafe amounts', () => {
    expect(() => Money.of(Number.NaN, PEN)).toThrow(InvalidMoneyError);
    expect(() => Money.fromMinor(1.5, PEN)).toThrow(InvalidMoneyError);
    expect(() => Money.fromMinor(Number.MAX_SAFE_INTEGER + 1, PEN)).toThrow(InvalidMoneyError);
  });

  it('adds money of the same currency', () => {
    const result = Money.add(Money.of(20, PEN), Money.of(5.5, PEN));
    expect(result).toEqual({ ok: true, value: { amountMinor: 2550, currency: PEN } });
  });

  it('refuses to add PEN and USD', () => {
    const result = Money.add(Money.of(20, PEN), Money.of(5, USD));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(CurrencyMismatchError);
  });

  it('compares same-currency money and refuses mixed currencies', () => {
    expect(Money.compare(Money.of(1, PEN), Money.of(2, PEN))).toEqual({ ok: true, value: -1 });
    expect(Money.compare(Money.of(2, PEN), Money.of(2, PEN))).toEqual({ ok: true, value: 0 });
    expect(Money.compare(Money.of(1, PEN), Money.of(1, USD)).ok).toBe(false);
  });

  it('formats in es-PE', () => {
    const text = Money.format(Money.of(20, PEN)).replace(/\s/g, ' ');
    expect(text).toBe('S/ 20.00');
  });

  it('detects zero', () => {
    expect(Money.isZero(Money.zero(PEN))).toBe(true);
    expect(Money.isZero(Money.of(0.01, PEN))).toBe(false);
  });
});

describe('parseCurrency', () => {
  it('accepts valid codes case-insensitively', () => {
    expect(parseCurrency(' pen ')).toEqual({ ok: true, value: 'PEN' });
  });

  it('rejects unknown codes', () => {
    const result = parseCurrency('XXX1');
    expect(result.ok).toBe(false);
  });
});

describe('CurrencyTotals', () => {
  it('keeps currencies separate', () => {
    const totals = sumMoney([Money.of(10, PEN), Money.of(5, USD), Money.of(2.5, PEN)]);
    expect(totalFor(totals, PEN)).toEqual(Money.of(12.5, PEN));
    expect(totalFor(totals, USD)).toEqual(Money.of(5, USD));
    expect(toMoneyList(totals)).toHaveLength(2);
  });

  it('does not mutate the previous totals', () => {
    const before = emptyTotals();
    const after = addTo(before, Money.of(1, PEN));
    expect(before.size).toBe(0);
    expect(after.get(PEN)).toBe(100);
  });

  it('returns zero for an absent currency', () => {
    expect(totalFor(emptyTotals(), USD)).toEqual(Money.zero(USD));
  });
});
