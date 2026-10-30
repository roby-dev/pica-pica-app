import { InjectionToken } from '@angular/core';
import type { CurrencyCode } from '@pp/shared/kernel';

/**
 * Designed for a future "see everything in one currency" view; nothing provides it yet, so no
 * total is ever converted. Inject it with `{ optional: true }` once a provider exists.
 */
export interface FxRatePort {
  /** Units of `to` per one unit of `from` on the given day (`YYYY-MM-DD`), or null when unknown. */
  rate(from: CurrencyCode, to: CurrencyCode, on: string): Promise<number | null>;
}

export const FX_RATE_PORT = new InjectionToken<FxRatePort>('FxRatePort');
