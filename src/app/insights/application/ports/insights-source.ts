import { InjectionToken, type Signal } from '@angular/core';
import type { CurrencyCode, Money } from '@pp/shared/kernel';
import type { SpendRecord } from '../../domain/expense-analytics';

/** How a category or method is shown. Only `name` is guaranteed. */
export interface LabelInfo {
  readonly name: string;
  readonly color?: string;
}

/**
 * Everything insights needs from the rest of the app, in insights' own vocabulary. An adapter in
 * `infrastructure/` translates the expenses and settings features into this, so analytics never
 * learns how they model their data and they never learn that analytics exists.
 */
export interface InsightsSource {
  /** Active expenses only. */
  readonly records: Signal<readonly SpendRecord[]>;
  readonly loading: Signal<boolean>;
  /** Amounts at or under this are ant expenses (in its currency only). */
  readonly threshold: Signal<Money>;
  readonly defaultCurrency: Signal<CurrencyCode>;
  readonly categories: Signal<ReadonlyMap<string, LabelInfo>>;
  readonly methods: Signal<ReadonlyMap<string, LabelInfo>>;
}

export const INSIGHTS_SOURCE = new InjectionToken<InsightsSource>('InsightsSource');
