import { err, ok, type Brand, type Result } from '@pp/shared/kernel';
import { ExpenseValidationError } from './expense.errors';

export type PlaceName = Brand<string, 'PlaceName'>;
export type Note = Brand<string, 'Note'>;

export const MAX_PLACE_LENGTH = 60;
export const MAX_NOTE_LENGTH = 280;

/** Empty input means "no place": the result is `null`, not an error. */
export function parsePlaceName(text: string | null | undefined): Result<PlaceName | null, ExpenseValidationError> {
  const value = (text ?? '').trim();
  if (value === '') return ok(null);
  if (value.length > MAX_PLACE_LENGTH) {
    return err(new ExpenseValidationError('place', `Use at most ${MAX_PLACE_LENGTH} characters`));
  }
  return ok(value as PlaceName);
}

/** Empty input means "no note". */
export function parseNote(text: string | null | undefined): Result<Note | null, ExpenseValidationError> {
  const value = (text ?? '').trim();
  if (value === '') return ok(null);
  if (value.length > MAX_NOTE_LENGTH) {
    return err(new ExpenseValidationError('note', `Use at most ${MAX_NOTE_LENGTH} characters`));
  }
  return ok(value as Note);
}

/** Normalized grouping key: "  Bodega  Doña Rosa " and "bodega dona rosa" are the same place. */
export function placeKey(place: PlaceName): string {
  return place
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
