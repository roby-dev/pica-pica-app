import { isoWeekKey, localDayKey, monthKey, parseOccurredAt, toOccurredAt, type OccurredAt } from './occurred-at';
import { parseNote, parsePlaceName, placeKey } from './place-name';

const at = (text: string) => text as OccurredAt;

describe('occurred-at keys', () => {
  it('reads day and month from the expense local time, not UTC', () => {
    const lateNight = at('2026-10-30T23:30:00-05:00'); // already Oct 31 in UTC
    expect(localDayKey(lateNight)).toBe('2026-10-30');
    expect(monthKey(lateNight)).toBe('2026-10');
  });

  it('starts ISO weeks on Monday', () => {
    expect(isoWeekKey(at('2026-10-26T09:00:00-05:00'))).toBe('2026-W44'); // Monday
    expect(isoWeekKey(at('2026-11-01T09:00:00-05:00'))).toBe('2026-W44'); // Sunday
    expect(isoWeekKey(at('2026-11-02T09:00:00-05:00'))).toBe('2026-W45'); // next Monday
  });

  it('handles the ISO year boundary', () => {
    expect(isoWeekKey(at('2026-01-01T09:00:00-05:00'))).toBe('2026-W01');
    expect(isoWeekKey(at('2027-01-01T09:00:00-05:00'))).toBe('2026-W53');
    expect(isoWeekKey(at('2024-12-30T09:00:00-05:00'))).toBe('2025-W01');
  });
});

describe('parseOccurredAt / toOccurredAt', () => {
  const now = new Date('2026-10-30T13:00:00-05:00');

  it('accepts offsets and Z', () => {
    expect(parseOccurredAt('2026-10-30T08:42:00-05:00', now).ok).toBe(true);
    expect(parseOccurredAt('2026-10-30T13:42:00Z', now).ok).toBe(true);
  });

  it('rejects text without an offset or with an impossible date', () => {
    expect(parseOccurredAt('2026-10-30', now).ok).toBe(false);
    expect(parseOccurredAt('2026-13-45T10:00:00-05:00', now).ok).toBe(false);
  });

  it('round-trips a Date through the local format', () => {
    const date = new Date(2026, 9, 30, 8, 5, 9);
    const formatted = toOccurredAt(date);
    expect(formatted).toMatch(/^2026-10-30T08:05:09[+-]\d{2}:\d{2}$/);
    expect(new Date(formatted).getTime()).toBe(date.getTime());
  });
});

describe('place and note', () => {
  it('normalizes place keys for grouping', () => {
    const a = parsePlaceName('  Bodega  Doña Rosa ');
    const b = parsePlaceName('bodega dona rosa');
    expect(a.ok && b.ok && placeKey(a.value!)).toBe(b.ok && placeKey(b.value!));
  });

  it('accepts the exact length limits', () => {
    expect(parsePlaceName('p'.repeat(60)).ok).toBe(true);
    expect(parseNote('n'.repeat(280)).ok).toBe(true);
  });
});
