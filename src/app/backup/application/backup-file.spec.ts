import { describe, expect, it } from 'vitest';
import { BackupFormatError, buildBackup, parseBackup } from './backup-file';

const expense = {
  id: 'e1', what: 'Café', amount: { amountMinor: 900, currency: 'PEN' }, categoryId: 'cat-cafe',
  paymentMethodId: 'pm-efectivo', place: null, occurredAt: '2026-10-30T08:00:00-05:00', note: null,
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};
const valid = {
  exportedAt: '2026-10-30T12:00:00-05:00',
  settings: { theme: 'dark' as const, defaultCurrency: 'PEN', antThresholdMinor: 2000 },
  categories: [{ id: 'cat-cafe', name: 'Café', emoji: '☕', color: 'red', archived: false, position: 0 }],
  methods: [{ id: 'pm-efectivo', name: 'Efectivo', kind: 'cash', archived: false, position: 0 }],
  expenses: [expense],
};

describe('backup file', () => {
  it('round-trips through JSON', () => {
    const file = buildBackup(valid as never);
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok && parsed.value).toEqual(file);
  });

  it.each([
    ['not json', 'nope'],
    ['another format', JSON.stringify({ format: 'x' })],
    ['a smart spend list', JSON.stringify([{ titulo: 'x', detalles: [] }])],
    ['a newer version', JSON.stringify({ ...buildBackup(valid as never), version: 2 })],
    ['a bad currency', JSON.stringify(buildBackup({ ...valid, expenses: [{ ...expense, amount: { amountMinor: 1, currency: 'ZZZ9' } }] } as never))],
    ['a non-positive threshold', JSON.stringify(buildBackup({ ...valid, settings: { ...valid.settings, antThresholdMinor: 0 } } as never))],
    ['a malformed expense', JSON.stringify(buildBackup({ ...valid, expenses: [{ id: 'e1' }] } as never))],
  ])('rejects %s', (_name, text) => {
    const parsed = parseBackup(text);
    expect(!parsed.ok && parsed.error).toBeInstanceOf(BackupFormatError);
  });
});
