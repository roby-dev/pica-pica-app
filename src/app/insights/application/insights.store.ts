import { Injectable, computed, inject, signal } from '@angular/core';
import { CLOCK } from '@pp/shared/di';
import { toIsoWithOffset, type CurrencyCode } from '@pp/shared/kernel';
import {
  antSplit,
  bucketSeries,
  byCategory,
  byMethod,
  byPlace,
  currenciesIn,
  dailyAverageMinor,
  projectedTotalMinor,
  recordsIn,
  sumMinor,
  topAnt,
  trend,
  unclassifiedCount,
  type RankedItem,
} from '../domain/expense-analytics';
import { canGoNext, previousRange, rangeFor, shiftAnchor, type PeriodKind } from '../domain/period';
import { INSIGHTS_SOURCE, type LabelInfo } from './ports/insights-source';

const PLACE_LIMIT = 5;

/** A ranked group with a human label resolved from the catalog. */
export interface LabeledItem extends RankedItem {
  readonly color?: string;
}

@Injectable({ providedIn: 'root' })
export class InsightsStore {
  private readonly source = inject(INSIGHTS_SOURCE);
  private readonly clock = inject(CLOCK);

  readonly period = signal<PeriodKind>('month');
  private readonly anchor = signal(toDay(this.clock.now()));
  private readonly chosenCurrency = signal<CurrencyCode | null>(null);

  readonly loading = this.source.loading;
  readonly threshold = this.source.threshold;

  readonly today = computed(() => toDay(this.clock.now()));
  readonly range = computed(() => rangeFor(this.period(), this.anchor()));
  readonly previous = computed(() => previousRange(this.period(), this.anchor()));
  readonly canGoNext = computed(() => canGoNext(this.period(), this.anchor(), this.today()));
  /** True while the shown period contains today, so "projection" and "per day so far" make sense. */
  readonly isCurrentPeriod = computed(() => !this.canGoNext());

  /** Currencies with spending in the shown period. The switcher only appears when there is more than one. */
  readonly currencies = computed(() => currenciesIn(this.source.records(), this.range()));

  /** The user's pick if it has data, else their default currency if it has data, else the busiest one. */
  readonly currency = computed<CurrencyCode>(() => {
    const available = this.currencies();
    const chosen = this.chosenCurrency();
    if (chosen && available.includes(chosen)) return chosen;
    const fallback = this.source.defaultCurrency();
    return available.includes(fallback) ? fallback : (available[0] ?? fallback);
  });

  private readonly current = computed(() => recordsIn(this.source.records(), this.range(), this.currency()));
  private readonly before = computed(() => recordsIn(this.source.records(), this.previous(), this.currency()));

  readonly count = computed(() => this.current().length);
  readonly hasData = computed(() => this.count() > 0);
  readonly totalMinor = computed(() => sumMinor(this.current()));
  readonly previousTotalMinor = computed(() => sumMinor(this.before()));
  readonly trend = computed(() => trend(this.totalMinor(), this.previousTotalMinor()));
  readonly dailyAverageMinor = computed(() => dailyAverageMinor(this.totalMinor(), this.range(), this.today()));
  readonly projectedMinor = computed(() => projectedTotalMinor(this.totalMinor(), this.range(), this.today()));

  readonly series = computed(() => bucketSeries(this.source.records(), this.period(), this.range(), this.currency()));

  readonly ant = computed(() => antSplit(this.current(), this.currency(), this.threshold()));
  readonly topAnt = computed(() => topAnt(this.current(), this.currency(), this.threshold()));
  /** Expenses in other currencies in this period; shown as a hint when the threshold cannot judge them. */
  readonly unclassified = computed(() =>
    unclassifiedCount(
      this.source.records().filter((r) => r.day >= this.range().fromDay && r.day <= this.range().toDay),
      this.threshold(),
    ),
  );

  readonly categories = computed(() => label(byCategory(this.current()), this.source.categories(), 'Sin categoría'));
  readonly methods = computed(() => label(byMethod(this.current()), this.source.methods(), 'Sin método'));
  readonly places = computed(() => byPlace(this.current()).slice(0, PLACE_LIMIT));

  setPeriod(kind: PeriodKind): void {
    if (kind === this.period()) return;
    this.period.set(kind);
    this.anchor.set(this.today());
  }

  previousPeriod(): void {
    this.anchor.set(shiftAnchor(this.period(), this.anchor(), -1));
  }

  nextPeriod(): void {
    if (this.canGoNext()) this.anchor.set(shiftAnchor(this.period(), this.anchor(), 1));
  }

  selectCurrency(code: CurrencyCode): void {
    this.chosenCurrency.set(code);
  }
}

const toDay = (date: Date): string => toIsoWithOffset(date).slice(0, 10);

function label(items: readonly RankedItem[], info: ReadonlyMap<string, LabelInfo>, fallback: string): readonly LabeledItem[] {
  return items.map((item) => {
    const found = info.get(item.key);
    return { ...item, label: found?.name ?? fallback, color: found?.color };
  });
}
