import type { Category, Expense, PaymentMethod } from '@pp/expenses';
import { DomainError, err, ok, parseCurrency, type Result } from '@pp/shared/kernel';

export const BACKUP_FORMAT = 'pica-pica-backup';
export const BACKUP_VERSION = 1;

export interface BackupSettings {
  readonly theme: 'system' | 'light' | 'dark';
  readonly defaultCurrency: string;
  readonly antThresholdMinor: number;
}

/** Everything the user created, as plain JSON. Deleted expenses are not part of a backup. */
export interface BackupFile {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  readonly exportedAt: string;
  readonly settings: BackupSettings;
  readonly categories: readonly Category[];
  readonly methods: readonly PaymentMethod[];
  readonly expenses: readonly Expense[];
}

export class BackupFormatError extends DomainError {
  readonly code = 'BACKUP_FORMAT';

  constructor(reason = 'This file is not a Pica-Pica backup') {
    super(reason);
  }
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNullableString = (v: unknown): boolean => v === null || isString(v);

const validCategory = (c: unknown): boolean =>
  isRecord(c) && isString(c['id']) && isString(c['name']) && isString(c['emoji']) && isString(c['color']) &&
  typeof c['archived'] === 'boolean' && isNumber(c['position']) &&
  (c['antSpending'] === undefined || typeof c['antSpending'] === 'boolean');

const validMethod = (m: unknown): boolean =>
  isRecord(m) && isString(m['id']) && isString(m['name']) && isString(m['kind']) &&
  typeof m['archived'] === 'boolean' && isNumber(m['position']);

const validExpense = (e: unknown): boolean => {
  if (!isRecord(e) || !isRecord(e['amount'])) return false;
  const amount = e['amount'];
  return (
    isString(e['id']) && isString(e['what']) && isNumber(amount['amountMinor']) && isString(amount['currency']) &&
    parseCurrency(amount['currency']).ok && isString(e['categoryId']) && isString(e['paymentMethodId']) &&
    isString(e['occurredAt']) && isNullableString(e['place']) && isNullableString(e['note'])
  );
};

const validSettings = (s: unknown): boolean =>
  isRecord(s) && ['system', 'light', 'dark'].includes(s['theme'] as string) && isString(s['defaultCurrency']) &&
  parseCurrency(s['defaultCurrency']).ok && isNumber(s['antThresholdMinor']) && s['antThresholdMinor'] > 0;

export function buildBackup(data: Omit<BackupFile, 'format' | 'version'>): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, ...data };
}

/** Parses and validates a backup. Nothing is read from a file that fails any check. */
export function parseBackup(text: string): Result<BackupFile, BackupFormatError> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return err(new BackupFormatError());
  }
  if (!isRecord(data) || data['format'] !== BACKUP_FORMAT) return err(new BackupFormatError());
  if (data['version'] !== BACKUP_VERSION) return err(new BackupFormatError('This backup comes from a newer version of the app'));
  const { settings, categories, methods, expenses } = data;
  const ok_ =
    isString(data['exportedAt']) && validSettings(settings) &&
    Array.isArray(categories) && categories.every(validCategory) &&
    Array.isArray(methods) && methods.every(validMethod) &&
    Array.isArray(expenses) && expenses.every(validExpense);
  return ok_ ? ok(data as unknown as BackupFile) : err(new BackupFormatError());
}
