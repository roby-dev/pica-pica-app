import { DomainError, err, ok, type Result } from '@pp/shared/kernel';

/** One purchased item from a Smart Spend shopping list, ready to become an expense. */
export interface SmartSpendItem {
  /** Source UUID, reused as the expense id so importing the same file twice changes nothing. */
  readonly id: string;
  readonly what: string;
  readonly amountMinor: number;
  /** The list title, e.g. "Mercado septiembre". */
  readonly place: string;
  /** ISO-8601 with the Lima offset. */
  readonly occurredAt: string;
}

export interface SmartSpendParse {
  readonly items: readonly SmartSpendItem[];
  /** Items without a price (never bought); they are not expenses. */
  readonly skipped: number;
}

export class SmartSpendFormatError extends DomainError {
  readonly code = 'SMART_SPEND_FORMAT';

  constructor() {
    super('This file is not a Smart Spend backup');
  }
}

/** Smart Spend stores naive local times; the user shops in Lima, which is UTC-5 all year. */
const LIMA_OFFSET = '-05:00';
const NAIVE_DATE_TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
const MAX_TEXT = 60;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Parses the JSON text of a Smart Spend backup: a list of shopping lists with their items. */
export function parseSmartSpend(text: string): Result<SmartSpendParse, SmartSpendFormatError> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return err(new SmartSpendFormatError());
  }
  if (!Array.isArray(data)) return err(new SmartSpendFormatError());

  const items: SmartSpendItem[] = [];
  let skipped = 0;
  for (const list of data) {
    if (!isRecord(list) || typeof list['titulo'] !== 'string' || !Array.isArray(list['detalles'])) {
      return err(new SmartSpendFormatError());
    }
    const place = list['titulo'].trim().slice(0, MAX_TEXT);
    for (const detail of list['detalles'] as unknown[]) {
      if (!isRecord(detail)) return err(new SmartSpendFormatError());
      const { uuid, nombre, precio, fecha } = detail;
      const stamp = typeof fecha === 'string' ? NAIVE_DATE_TIME.exec(fecha) : null;
      if (typeof uuid !== 'string' || typeof nombre !== 'string' || typeof precio !== 'number' || !stamp) {
        return err(new SmartSpendFormatError());
      }
      const amountMinor = Math.round(precio * 100);
      if (amountMinor <= 0) {
        skipped++;
        continue;
      }
      items.push({
        id: uuid,
        what: nombre.trim().slice(0, MAX_TEXT),
        amountMinor,
        place,
        occurredAt: `${stamp[1]}${LIMA_OFFSET}`,
      });
    }
  }
  return ok({ items, skipped });
}
