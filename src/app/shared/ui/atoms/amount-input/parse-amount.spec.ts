import { parseAmountToMinor } from './parse-amount';

describe('parseAmountToMinor (exponent 2)', () => {
  const parse = (text: string) => parseAmountToMinor(text, 2);

  it.each([
    ['20.50', 2050],
    ['20,50', 2050],
    ['20', 2000],
    ['0.5', 50],
    ['.5', 50],
    ['8.5', 850],
    ['1,250.50', 125050],
    ['1.250,50', 125050],
    ['1,250', 125000],
    ['1.250.000', 125000000],
    ['S/ 20.00', 2000],
  ])('reads "%s" as %i', (text, expected) => {
    expect(parse(text)).toBe(expected);
  });

  it.each(['', '   ', 'abc', 'S/', '.', ',', '20.505', '1,25,0', '12,34.56,7'])(
    'rejects "%s"',
    (text) => {
      expect(parse(text)).toBeNull();
    },
  );

  it('respects currencies without decimals', () => {
    expect(parseAmountToMinor('500', 0)).toBe(500);
    expect(parseAmountToMinor('1,500', 0)).toBe(1500);
    expect(parseAmountToMinor('20.5', 0)).toBeNull();
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(parse('99999999999999999')).toBeNull();
  });
});
