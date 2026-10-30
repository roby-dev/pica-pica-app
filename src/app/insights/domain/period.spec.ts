import {
  addDays,
  canGoNext,
  daysInRange,
  elapsedDays,
  listDays,
  listMonths,
  previousRange,
  rangeFor,
  shiftAnchor,
} from './period';

describe('rangeFor', () => {
  it('starts weeks on Monday and ends them on Sunday', () => {
    // 2026-10-30 is a Friday.
    expect(rangeFor('week', '2026-10-30')).toEqual({ fromDay: '2026-10-26', toDay: '2026-11-01' });
    expect(rangeFor('week', '2026-10-26')).toEqual({ fromDay: '2026-10-26', toDay: '2026-11-01' });
    expect(rangeFor('week', '2026-11-01')).toEqual({ fromDay: '2026-10-26', toDay: '2026-11-01' });
  });

  it('covers whole months, leap February included', () => {
    expect(rangeFor('month', '2026-10-15')).toEqual({ fromDay: '2026-10-01', toDay: '2026-10-31' });
    expect(rangeFor('month', '2028-02-10')).toEqual({ fromDay: '2028-02-01', toDay: '2028-02-29' });
    expect(rangeFor('month', '2026-02-10').toDay).toBe('2026-02-28');
  });

  it('covers whole years', () => {
    expect(rangeFor('year', '2026-06-01')).toEqual({ fromDay: '2026-01-01', toDay: '2026-12-31' });
  });

  it('lets a week cross a month and a year boundary', () => {
    expect(rangeFor('week', '2026-12-31')).toEqual({ fromDay: '2026-12-28', toDay: '2027-01-03' });
  });
});

describe('shiftAnchor and previousRange', () => {
  it('moves by whole weeks', () => {
    expect(shiftAnchor('week', '2026-10-30', -1)).toBe('2026-10-23');
    expect(previousRange('week', '2026-10-30')).toEqual({ fromDay: '2026-10-19', toDay: '2026-10-25' });
  });

  it('moves months without day overflow, even from the 31st', () => {
    expect(shiftAnchor('month', '2026-03-31', -1)).toBe('2026-02-01');
    expect(previousRange('month', '2026-03-31')).toEqual({ fromDay: '2026-02-01', toDay: '2026-02-28' });
    expect(shiftAnchor('month', '2026-12-15', 1)).toBe('2027-01-01');
  });

  it('moves years', () => {
    expect(previousRange('year', '2026-05-05')).toEqual({ fromDay: '2025-01-01', toDay: '2025-12-31' });
  });
});

describe('canGoNext', () => {
  it('stops at the period that contains today', () => {
    expect(canGoNext('week', '2026-10-30', '2026-10-30')).toBe(false);
    expect(canGoNext('week', '2026-10-23', '2026-10-30')).toBe(true);
    expect(canGoNext('month', '2026-09-01', '2026-10-30')).toBe(true);
    expect(canGoNext('month', '2026-10-01', '2026-10-30')).toBe(false);
  });
});

describe('day counting', () => {
  it('counts days in a range and lists them', () => {
    const week = rangeFor('week', '2026-10-30');
    expect(daysInRange(week)).toBe(7);
    expect(listDays(week)[0]).toBe('2026-10-26');
    expect(listDays(week).at(-1)).toBe('2026-11-01');
    expect(daysInRange(rangeFor('year', '2028-01-01'))).toBe(366);
  });

  it('counts elapsed days only up to today, and none before the range starts', () => {
    const month = rangeFor('month', '2026-10-15');
    expect(elapsedDays(month, '2026-10-10')).toBe(10);
    expect(elapsedDays(month, '2026-11-20')).toBe(31);
    expect(elapsedDays(month, '2026-09-30')).toBe(0);
  });

  it('lists the months a range touches', () => {
    expect(listMonths(rangeFor('year', '2026-01-01'))).toHaveLength(12);
    expect(listMonths(rangeFor('week', '2026-12-31'))).toEqual(['2026-12', '2027-01']);
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
