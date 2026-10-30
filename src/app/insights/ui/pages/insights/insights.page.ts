import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DEFAULT_LOCALE, Money, type CurrencyCode } from '@pp/shared/kernel';
import { AmountText, AppHeader, Badge, EmptyState, SegmentedControl, Skeleton, type SegmentOption } from '@pp/shared/ui';
import { InsightsStore } from '../../../application/insights.store';
import type { PeriodKind } from '../../../domain/period';
import { BarChart } from '../../components/bar-chart/bar-chart';
import { CurrencySwitcher } from '../../components/currency-switcher/currency-switcher';
import { DonutChart, type DonutSlice } from '../../components/donut-chart/donut-chart';
import { PeriodNavigator } from '../../components/period-navigator/period-navigator';
import { RankList, type RankRow } from '../../components/rank-list/rank-list';
import { TopAntList, type TopAntRow } from '../../components/top-ant-list/top-ant-list';
import { barPoints, periodLabel, previousPeriodName } from './insights-view';

const PERIODS: readonly SegmentOption[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

const FALLBACK_COLOR = 'oklch(0.75 0.03 285)';

@Component({
  selector: 'pp-insights-page',
  imports: [
    AmountText,
    AppHeader,
    Badge,
    BarChart,
    CurrencySwitcher,
    DonutChart,
    EmptyState,
    PeriodNavigator,
    RankList,
    SegmentedControl,
    Skeleton,
    TopAntList,
  ],
  template: `
    <pp-app-header title="Análisis" subtitle="Dónde se va tu plata" />

    <div class="flex flex-col gap-4 px-4 pb-6">
      <pp-segmented-control [options]="periods" [value]="store.period()" (valueChange)="store.setPeriod($any($event))" />
      <pp-period-navigator
        [label]="rangeLabel()"
        [canGoNext]="store.canGoNext()"
        (prev)="store.previousPeriod()"
        (next)="store.nextPeriod()"
      />

      @if (store.currencies().length > 1) {
        <pp-currency-switcher
          [currencies]="store.currencies()"
          [value]="store.currency()"
          (valueChange)="select($event)"
        />
      }

      @if (store.loading()) {
        <pp-skeleton shape="rect" />
        <pp-skeleton shape="rect" />
      } @else if (!store.hasData()) {
        <pp-empty-state
          icon="chart"
          title="Sin gastos en este período"
          message="Cuando registres gastos, aquí verás cuánto se va y en qué."
        />
      } @else {
        <section class="glass-strong flex flex-col gap-3 p-5" aria-label="Total del período">
          <span class="text-sm font-medium text-ink-muted">Total gastado</span>
          <pp-amount-text [money]="total()" emphasis="xl" />
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            @if (store.trend(); as trend) {
              <pp-badge [tone]="trend.direction === 'flat' ? 'neutral' : trend.direction" [text]="trendText()" />
              <span class="text-xs text-ink-muted">vs {{ previousName() }}</span>
            }
          </div>
          <dl class="grid grid-cols-2 gap-3 border-t border-[var(--glass-border)] pt-3 text-sm">
            <div>
              <dt class="text-ink-muted">Promedio por día</dt>
              <dd class="font-semibold text-ink"><pp-amount-text [money]="money(store.dailyAverageMinor())" emphasis="md" /></dd>
            </div>
            <div>
              <dt class="text-ink-muted">{{ store.projectedMinor() === null ? 'Gastos' : 'A este ritmo' }}</dt>
              <dd class="font-semibold text-ink">
                @if (store.projectedMinor() !== null) {
                  <pp-amount-text [money]="money(store.projectedMinor()!)" emphasis="md" />
                } @else {
                  {{ store.count() }}
                }
              </dd>
            </div>
          </dl>
        </section>

        <section class="glass flex flex-col gap-3 p-5" aria-label="Gastos hormiga">
          <h2 class="text-base font-bold text-ink">Gastos hormiga</h2>
          @if (store.ant().classified) {
            @if (store.ant().antShare !== null) {
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-4xl font-bold tracking-tight text-ink">{{ antPercent() }}%</span>
                <pp-amount-text [money]="money(store.ant().antTotalMinor)" emphasis="md" />
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                <div class="h-full rounded-full bg-accent" [style.width.%]="antPercent()"></div>
              </div>
            }
            <p class="text-sm text-ink-muted">
              {{ store.ant().antCount }} {{ store.ant().antCount === 1 ? 'gasto' : 'gastos' }} de
              {{ thresholdText() }} o menos.
            </p>
          } @else {
            <p class="text-sm text-ink-muted">
              Tu umbral está en {{ store.threshold().currency }}, así que los gastos en {{ store.currency() }} no se
              clasifican como hormiga. No se convierten monedas.
            </p>
          }
          @if (store.unclassified() > 0 && store.ant().classified) {
            <p class="text-xs text-ink-muted">
              {{ store.unclassified() }} {{ store.unclassified() === 1 ? 'gasto' : 'gastos' }} en otra moneda no se
              {{ store.unclassified() === 1 ? 'incluye' : 'incluyen' }} aquí.
            </p>
          }
        </section>

        <section class="glass flex flex-col gap-3 p-5" aria-label="Gasto por día">
          <h2 class="text-base font-bold text-ink">{{ store.period() === 'year' ? 'Por mes' : 'Por día' }}</h2>
          <pp-bar-chart
            [series]="bars()"
            [formatValue]="formatMinor()"
            [highlightKey]="store.isCurrentPeriod() ? todayKey() : undefined"
          />
        </section>

        <section class="glass flex flex-col gap-3 p-5" aria-label="Gasto por categoría">
          <h2 class="text-base font-bold text-ink">Por categoría</h2>
          <pp-donut-chart [slices]="slices()" [centerLabel]="'Total ' + totalText()" />
        </section>

        @if (store.places().length > 0) {
          <section class="glass flex flex-col gap-3 p-5" aria-label="Lugares">
            <h2 class="text-base font-bold text-ink">Dónde más gastas</h2>
            <pp-rank-list [rows]="placeRows()" />
          </section>
        }

        <section class="glass flex flex-col gap-3 p-5" aria-label="Métodos de pago">
          <h2 class="text-base font-bold text-ink">Cómo pagas</h2>
          <pp-rank-list [rows]="methodRows()" />
        </section>

        @if (store.topAnt().length > 0) {
          <section class="glass flex flex-col gap-1 px-5 pb-2 pt-5" aria-label="Hábitos hormiga">
            <h2 class="text-base font-bold text-ink">Tus hábitos hormiga</h2>
            <p class="text-sm text-ink-muted">Lo que más se repite en gastos chicos.</p>
            <pp-top-ant-list [items]="antRows()" />
          </section>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  protected readonly store = inject(InsightsStore);
  protected readonly periods = PERIODS;

  private readonly locale = DEFAULT_LOCALE;

  protected readonly rangeLabel = computed(() => periodLabel(this.store.period(), this.store.range(), this.locale));
  protected readonly previousName = computed(() => previousPeriodName(this.store.period()));
  protected readonly todayKey = this.store.today;

  protected readonly total = computed(() => this.money(this.store.totalMinor()));
  protected readonly totalText = computed(() => Money.format(this.total(), this.locale));
  protected readonly thresholdText = computed(() => Money.format(this.store.threshold(), this.locale));
  protected readonly antPercent = computed(() => Math.round((this.store.ant().antShare ?? 0) * 100));

  protected readonly trendText = computed(() => {
    const trend = this.store.trend();
    if (!trend) return '';
    const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '−' : '';
    return `${sign}${Math.abs(Math.round(trend.deltaPct))}%`;
  });

  protected readonly formatMinor = computed(() => (minor: number) => Money.format(this.money(minor), this.locale));
  protected readonly bars = computed(() => barPoints(this.store.series(), this.store.period() as PeriodKind, this.locale));

  protected readonly slices = computed<readonly DonutSlice[]>(() =>
    this.store.categories().map((c) => ({
      key: c.key,
      label: c.label,
      value: c.totalMinor,
      color: c.color ?? FALLBACK_COLOR,
      valueText: this.formatMinor()(c.totalMinor),
    })),
  );

  protected readonly placeRows = computed<readonly RankRow[]>(() =>
    this.store.places().map((p) => ({ ...p, valueText: this.formatMinor()(p.totalMinor) })),
  );

  protected readonly methodRows = computed<readonly RankRow[]>(() =>
    this.store.methods().map((m) => ({ ...m, valueText: this.formatMinor()(m.totalMinor) })),
  );

  protected readonly antRows = computed<readonly TopAntRow[]>(() =>
    this.store.topAnt().map((a) => ({ key: a.key, what: a.what, place: a.place, count: a.count, total: this.money(a.totalMinor) })),
  );

  protected money(amountMinor: number): Money {
    return { amountMinor, currency: this.store.currency() };
  }

  protected select(code: CurrencyCode | null): void {
    if (code) this.store.selectCurrency(code);
  }
}
