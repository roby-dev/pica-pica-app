# pica-pica — Architecture Design

Mobile-first, installable (iOS) PWA for tracking "ant expenses" (gastos hormiga): small, frequent
spends. MVP is 100% local (IndexedDB); the design keeps a backend swap invisible to the UI.
Product language: Spanish (Peru) UI copy; code, docs and tests in English.

---

## 1. Stack & exact versions (verified against npm registry, 2026-10-30)

| Concern | Choice | Version |
|---|---|---|
| Framework | `@angular/core` / `@angular/compiler-cli` | 22.2.4 |
| CLI / builder | `@angular/cli` (application builder, esbuild) | 22.2.5 |
| TypeScript | required by compiler-cli peer range `>=6.0 <6.1` | 6.0.x |
| Node | Angular engines `^22.22.3 \|\| ^24.15.0 \|\| >=26` | use Node 24 LTS |
| Package manager | pnpm | 12.16.1 |
| CSS | `tailwindcss` + `@tailwindcss/postcss` (v4 CSS-first config) | 4.3.3 |
| PWA | `@angular/service-worker` (`ng add @angular/pwa`) | 22.2.x |
| IndexedDB wrapper | `idb` (promise wrapper, ~1 KB) | 8.0.4 |
| Unit tests | Vitest via `@angular/build:unit-test` (CLI default since v21) | pinned by CLI (registry latest 5.0.5) |
| Lint boundaries | `angular-eslint` + `eslint-plugin-boundaries` | latest |
| E2E | Playwright, WebKit project for iOS-like checks | latest |

Angular 22 facts relied upon: Signal Forms stable; `resource()`, `rxResource()`, `httpResource()` stable;
`@Service` shorthand for root `@Injectable`; `injectAsync` (lazy service loading) available;
`debounced()` still experimental (not used). Zoneless: new CLI projects are zoneless; we still call
`provideZonelessChangeDetection()` explicitly and never install `zone.js` (so no `fakeAsync`/`waitForAsync`).

Rules: standalone everywhere, `ChangeDetectionStrategy.OnPush` on every component (explicit),
`input()/output()/model()/viewChild()`, `@if/@for/@switch/@defer`, `inject()` only, no `NgModule`,
no RxJS in app state (RxJS only inside the future HTTP adapter).

---

## 2. Domain model

Domain code is framework-free TypeScript (no `@angular/*` imports).

### Shared kernel value objects (`shared/kernel/`) — used by every feature
- `CurrencyCode` — branded ISO-4217 string; valid iff in `Intl.supportedValuesOf('currency')`.
  App default: **`PEN`**. Locale: **`es-PE`** (`S/ 20.00`).
- `Money` — `{ readonly amountMinor: number /* safe integer */, readonly currency: CurrencyCode }`.
  - `minorExponent(currency)` from `new Intl.NumberFormat('es-PE',{style:'currency',currency}).resolvedOptions().maximumFractionDigits` (PEN=2, so S/ 20.00 = `2000`).
  - Ops: `Money.of(major, currency)`, `Money.fromMinor(minor, currency)`, `add(a,b)`, `compare(a,b)`,
    `isZero`, `format(locale)`. **`add`/`compare` return `CurrencyMismatchError` when currencies differ** —
    the type system and runtime both forbid mixing currencies.
  - `CurrencyTotals` — `ReadonlyMap<CurrencyCode, number /* minor */>` with `addTo(totals, money)`.
    This is the only way to aggregate amounts.
- `ExpenseId`/ids — branded `string` from `crypto.randomUUID()` (client-generated: offline-safe, sync-ready).
- `Result<T,E>` (`{ok:true,value}|{ok:false,error}`), `DomainError` base, `Brand<T,B>`, `Clock` port.

### Expenses domain (`expenses/domain/`)
- `OccurredAt` — ISO-8601 with offset (`2026-10-30T08:15:00-05:00`); helpers `localDayKey()`
  (`YYYY-MM-DD`), `isoWeekKey()` (weeks start **Monday**), `monthKey()`. Rule: ≤ now + 1 day.
- `PlaceName` — trimmed 1..60 chars, optional; `placeKey` normalized (lowercase, no accents) for grouping.
- `Note` — trimmed 0..280.
```ts
interface Expense {
  readonly id: ExpenseId;
  readonly what: string;                       // 1..60 chars — "que cosas"
  readonly amount: Money;                      // own currency per expense — "cuanto"
  readonly categoryId: CategoryId;
  readonly paymentMethodId: PaymentMethodId;   // "como"
  readonly place: PlaceName | null;            // "donde"
  readonly occurredAt: OccurredAt;             // "cuando"
  readonly note: Note | null;
  readonly createdAt: string; readonly updatedAt: string; // sync/conflict
  readonly deletedAt: string | null;           // soft delete → future sync tombstones
}
interface Category { id: CategoryId; name: string; emoji: string; color: TokenColor; archived: boolean; }
interface PaymentMethod { id: PaymentMethodId; name: string; kind: 'cash'|'debit'|'credit'|'transfer'|'wallet'|'other'; archived: boolean; }
```
Seeds — categories: Café, Snacks, Transporte, Delivery, Suscripciones, Antojos, Bodega, Otros.
Methods: Efectivo, Débito, Crédito, Yape/Plin (wallet), Transferencia.

### Settings domain (`settings/domain/`)
```ts
interface AppSettings {
  defaultCurrency: CurrencyCode;      // 'PEN' — preselected currency for new expenses
  antExpenseThreshold: Money;         // default { amountMinor: 2000, currency: 'PEN' } = S/ 20.00
  theme: 'system' | 'light' | 'dark';
  weekStartsOn: 1;                    // Monday (fixed in MVP)
  lastBackupAt: string | null;
}
```

### Domain rules
1. An expense requires `what`, `amount.amountMinor > 0` (≤ 1e12), valid `currency`, `categoryId`, `paymentMethodId`, `occurredAt`.
2. Each expense stores its own currency; new expenses default to `settings.defaultCurrency`. MVP UI exposes only the default currency picker hidden behind "Cambiar moneda" (data model already multi-currency).
3. **Never sum different currencies.** All totals are `CurrencyTotals`; no conversion logic exists yet.
4. Ant expense: `expense.amount.currency === threshold.currency && expense.amountMinor <= threshold.amountMinor`.
   Expenses in other currencies are `unclassified` (not ant, not non-ant) until an FX port exists.
5. Threshold must be > 0. If `defaultCurrency` changes and differs from the threshold currency, the settings
   use case requires a new threshold value in the new currency (no conversion) — UI prompts for it.
6. Archived categories/methods cannot be picked for new expenses but remain valid on old ones; deleting
   one in use is forbidden (`CategoryInUseError`) → archive.
7. Delete expense = soft delete; lists/analytics ignore `deletedAt != null`; undo within 5 s restores.
8. Factories return `Result<T, DomainError>`; no throwing across layers.

### Future FX (designed, not built)
`insights/application/ports/fx-rate.port.ts`: `interface FxRatePort { rate(from: CurrencyCode, to: CurrencyCode, on: string): Promise<number | null> }`
+ token `FX_RATE_PORT` (optional injection, not provided in MVP). Domain `convertTotals(totals, target, rates)`
is specified but unimplemented; when a provider is added, `InsightsStore` gains `convertedTotal` computed
without changing existing per-currency computeds.

---

## 3. Frontend structure — screaming architecture

### (a) Full tree
```
pica-pica/
├─ angular.json  package.json  pnpm-lock.yaml  tsconfig*.json  .postcssrc.json  ngsw-config.json  eslint.config.js
├─ public/  manifest.webmanifest  icons/  splash/
├─ e2e/     add-expense.spec.ts  offline.spec.ts
└─ src/
   ├─ index.html  main.ts  styles.css
   └─ app/
      ├─ app.ts  app.config.ts  app.routes.ts          # composition root only
      │
      ├─ expenses/                                   # record & manage ant expenses
      │  ├─ index.ts                                 # PUBLIC API
      │  ├─ expenses.providers.ts                    # provideExpenses({ persistence })
      │  ├─ expenses.routes.ts                       # expensesRoutes, catalogRoutes
      │  ├─ domain/      expense.ts(+.spec) occurred-at.ts place-name.ts note.ts category.ts
      │  │               payment-method.ts expense.errors.ts catalog.seeds.ts
      │  ├─ application/
      │  │  ├─ ports/    expense.repository.ts  catalog.repository.ts
      │  │  │            expense.repository.contract.ts   # shared contract test suite
      │  │  ├─ use-cases/ add-expense.ts update-expense.ts delete-expense.ts restore-expense.ts
      │  │  │             seed-catalog.ts archive-category.ts (+ .spec each)
      │  │  └─ expenses.store.ts  catalog.store.ts (+ .spec)
      │  ├─ infrastructure/
      │  │  ├─ indexeddb/ idb-expense.repository.ts  idb-catalog.repository.ts  expense.record.ts  expense.mapper.ts
      │  │  ├─ memory/    in-memory-expense.repository.ts  in-memory-catalog.repository.ts
      │  │  └─ http/      http-expense.repository.ts (stub)  expense.dto.ts
      │  └─ ui/
      │     ├─ pages/      quick-add/ history/ expense-edit/ catalog-categories/ catalog-methods/
      │     └─ components/ expense-form/ expense-row/ expense-list/ day-group/
      │                    category-picker/ method-picker/ place-field/
      │
      ├─ insights/                                   # understand spending over time
      │  ├─ index.ts  insights.providers.ts  insights.routes.ts
      │  ├─ domain/      period.ts  expense-analytics.ts  analytics.types.ts  fx-conversion.ts (spec only)
      │  ├─ application/
      │  │  ├─ ports/    expense-source.port.ts  ant-threshold-source.port.ts  fx-rate.port.ts
      │  │  └─ insights.store.ts
      │  ├─ infrastructure/ expenses-store.source.ts  settings-store.threshold-source.ts   # ACL over other features
      │  └─ ui/
      │     ├─ pages/      insights/
      │     └─ components/ bar-chart/ donut-chart/ top-ant-list/ currency-switcher/ period-navigator/
      │
      ├─ settings/                                   # personal preferences
      │  ├─ index.ts  settings.providers.ts  settings.routes.ts
      │  ├─ domain/      app-settings.ts  settings.rules.ts
      │  ├─ application/ ports/settings.repository.ts  use-cases/update-settings.ts  settings.store.ts
      │  ├─ infrastructure/ idb-settings.repository.ts  in-memory-settings.repository.ts
      │  └─ ui/
      │     ├─ pages/      settings/
      │     └─ components/ threshold-field/ currency-select/ theme-select/
      │
      ├─ backup/                                     # keep my data safe (export/import)
      │  ├─ index.ts  backup.providers.ts  backup.routes.ts
      │  ├─ domain/      backup-file.ts (schemaVersion, validation)
      │  ├─ application/ ports/file-saver.port.ts  use-cases/export-json.ts export-csv.ts import-json.ts
      │  ├─ infrastructure/ browser-file-saver.ts
      │  └─ ui/ pages/backup/  components/backup-reminder/
      │
      ├─ shell/                                      # the app frame (layout, nav, install, updates, theme)
      │  ├─ index.ts  shell.providers.ts
      │  ├─ layout/      app-layout.ts (header + outlet + tab bar + toast host)
      │  ├─ navigation/  tab-items.ts
      │  ├─ pwa/         sw-update.service.ts  ios-install.service.ts  install-hint/
      │  └─ theme/       theme.effect.ts (data-theme + theme-color meta)
      │
      └─ shared/                                     # small shared kernel, no business features
         ├─ kernel/      money.ts currency.ts currency-totals.ts result.ts domain-error.ts brand.ts
         │               clock.ts id-generator.ts (+ .spec)
         ├─ persistence/ idb-database.ts (open, schema v1, migrations)  storage-persist.ts
         ├─ ui/
         │  ├─ atoms/     glass-surface/ icon/ button/ icon-button/ amount-text/ chip/ text-field/
         │  │             amount-input/ badge/ skeleton/ divider/ toggle/
         │  ├─ molecules/ segmented-control/ stat-card/ empty-state/ toast/ search-bar/ date-time-field/
         │  └─ organisms/ tab-bar/ app-header/ bottom-sheet/
         └─ testing/     builders.ts  fake-clock.ts  test-providers.ts
```
Each component folder holds `x.ts` + `x.spec.ts` (inline template; separate `.html` only if > 60 lines).
Path aliases (`tsconfig.json`): `@pp/expenses`, `@pp/insights`, `@pp/settings`, `@pp/backup`, `@pp/shell`,
`@pp/shared/kernel`, `@pp/shared/persistence`, `@pp/shared/ui`, `@pp/shared/testing` — each pointing at an `index.ts`.

### (b) What each root folder screams
| Folder | Screams |
|---|---|
| `expenses/` | "I record, edit, list and categorize ant expenses (what, how much, when, how, where)." |
| `insights/` | "I tell you where your money leaks: totals, trends, top ant expenses — per currency." |
| `settings/` | "I hold your preferences: default currency, ant threshold, theme." |
| `backup/` | "I export and import your data so the browser can't lose it." |
| `shell/` | "I am the app frame: layout, bottom tab bar, install hint, update prompt, theme." |
| `shared/` | "Business-agnostic kernel: Money, Result, IDB connection, glass UI kit." |

### (c) Dependency rules (enforced with `eslint-plugin-boundaries` + `no-restricted-imports`)
Feature graph (acyclic): `settings ← expenses ← insights`, `insights → settings`, `backup → expenses, settings`,
`shell → settings`. Cross-feature imports go **only** through `@pp/<feature>` (barrel); deep imports
like `@pp/expenses/domain/...` or relative `../../expenses/...` are lint errors.

| From (layer) | May import | Must NOT import |
|---|---|---|
| `shared/kernel` | nothing (TS + `Intl` only) | anything else |
| `shared/ui` | `shared/kernel`, `@angular/core`, `@angular/router` | features, persistence |
| `shared/persistence` | `shared/kernel`, `idb` | features, ui |
| `<f>/domain` | `shared/kernel`, own `domain` | Angular, application, infrastructure, ui, other features |
| `<f>/application` | own `domain`, `shared/kernel`, `@angular/core`, other features' public API | own `infrastructure`, any `ui` |
| `<f>/infrastructure` | own `application/ports`, own `domain`, `shared/kernel`, `shared/persistence`, other features' public API (ACL adapters) | `ui` |
| `<f>/ui/components` (presentational) | own `domain` types, `shared/ui`, `shared/kernel` | stores, use cases, `inject()` of app services, infrastructure |
| `<f>/ui/pages` (containers) | own `application`, own `domain`, own `ui/components`, `shared/ui`, `shared/kernel` | `infrastructure` (any feature) |
| `<f>/<f>.providers.ts` | own `infrastructure`, own `application` | — (only file allowed to bind adapters) |
| `<f>/index.ts` | exports: `provideX`, routes, stores (readonly facade type), domain types, port tokens | infrastructure classes |
| `app.*` (root) | features' public API, `shell`, `shared` | feature internals |

`eslint.config.js` sketch: boundaries elements `kernel|shared-ui|shared-persistence|shared-testing|domain|application|infrastructure|components|pages|feature-entry|shell|app`
with `capture: ['feature']`; rule `boundaries/element-types` per table; `boundaries/entry-point` allowing only
`index.ts` across features; `*.spec.ts` may also import `shared/testing`.

### (d) Wiring: DI and lazy routes
```ts
// app.config.ts — composition root
export const appConfig: ApplicationConfig = { providers: [
  provideZonelessChangeDetection(), provideBrowserGlobalErrorListeners(),
  { provide: LOCALE_ID, useValue: 'es-PE' },
  provideRouter(appRoutes, withComponentInputBinding(), withViewTransitions(),
    withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }), withPreloading(PreloadAllModules)),
  provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),
  provideShared(),                                    // CLOCK, ID_GENERATOR, IDB_DATABASE (lazy-opened)
  provideSettings({ persistence: environment.persistence }),
  provideExpenses({ persistence: environment.persistence }),   // 'indexeddb' | 'memory' | 'http'
  provideInsights(), provideBackup(), provideShell(),
]};
```
- `provideX()` returns `makeEnvironmentProviders([...])` binding the feature's port tokens to adapters
  (e.g. `{provide: EXPENSE_REPOSITORY, useClass: IdbExpenseRepository}`) plus `provideAppInitializer` hooks
  (seed catalog, `storage.persist()`). Registered at environment level because stores are shared across
  features (insights reads expenses); these providers are tiny — heavy code stays in lazy page chunks.
  Backup's CSV/JSON serializers are loaded with `injectAsync` only when the user taps Export.
- Each feature's `<f>.routes.ts` exports a `Routes` array where **every page uses `loadComponent`**:
```ts
// expenses/expenses.routes.ts
export const expensesRoutes: Routes = [
  { path: 'add', title: 'Agregar', loadComponent: () => import('./ui/pages/quick-add/quick-add.page') },
  { path: 'history', title: 'Historial', loadComponent: () => import('./ui/pages/history/history.page') },
  { path: 'history/:id', title: 'Editar', loadComponent: () => import('./ui/pages/expense-edit/expense-edit.page') },
];
export const catalogRoutes: Routes = [ /* 'categories', 'methods' */ ];
// app.routes.ts
export const appRoutes: Routes = [{ path: '', component: AppLayout, children: [
  { path: '', pathMatch: 'full', redirectTo: 'add' },
  ...expensesRoutes, ...insightsRoutes,
  { path: 'settings', children: [...settingsRoutes, ...catalogRoutes, ...backupRoutes] },
  { path: '**', redirectTo: 'add' } ]}];
```
- Features never link to each other by import; navigation across features uses URL strings (`routerLink="/settings/backup"`).
- Swap to backend later: change `environment.persistence` to `'http'` (and add `provideHttpClient()`); no ui change.

---

## 4. Ports & adapters

```ts
// expenses/application/ports/expense.repository.ts
export interface ExpenseQuery { from?: string; to?: string; currency?: CurrencyCode; includeDeleted?: boolean; }
export interface ExpenseRepository {
  list(q?: ExpenseQuery): Promise<readonly Expense[]>;
  get(id: ExpenseId): Promise<Expense | null>;
  save(e: Expense): Promise<void>;                 // upsert
  saveMany(e: readonly Expense[]): Promise<void>;  // import
  softDelete(id: ExpenseId, at: string): Promise<void>;
  restore(id: ExpenseId): Promise<void>;
}
export const EXPENSE_REPOSITORY = new InjectionToken<ExpenseRepository>('ExpenseRepository');
// CATALOG_REPOSITORY (categories, methods), SETTINGS_REPOSITORY (load/save AppSettings)
// insights: EXPENSE_SOURCE { expenses: Signal<readonly Expense[]> }, ANT_THRESHOLD_SOURCE { threshold: Signal<Money> }
```
Promise-based so IDB and HTTP (`firstValueFrom`) both fit; stores wrap them with `resource()`.

**Why IndexedDB over localStorage:** async (no main-thread jank), structured records + indexes, much larger
quota (localStorage ≈ 5 MB, strings only), transactional, usable from the Service Worker (future sync).
localStorage keeps only the `pp-theme` hint for flash-free first paint.

**IndexedDB schema** (`shared/persistence/idb-database.ts`, DB `pica-pica`, version 1; each feature owns its stores'
mappers, the DB file owns `upgrade()` migrations in order):

| Store | keyPath | Record shape | Indexes |
|---|---|---|---|
| `expenses` | `id` | `{id, what, amountMinor, currency, categoryId, paymentMethodId, place, placeKey, occurredAt, occurredDay, note, createdAt, updatedAt, deletedAt}` | `by_occurredAt`, `by_currency_occurredAt` (compound `[currency, occurredAt]`), `by_categoryId` |
| `categories` | `id` | `Category` | — |
| `paymentMethods` | `id` | `PaymentMethod` | — |
| `settings` | `key` | `{key:'app', defaultCurrency:'PEN', antExpenseThreshold:{amountMinor:2000,currency:'PEN'}, theme, weekStartsOn:1, lastBackupAt}` | — |
| `meta` | `key` | `{key:'schema', version:1, seededAt}` | — |

Currency is stored per expense from day one → multi-currency needs no migration. A future `fxRates` store
(`[from,to,day]`) is reserved for a cached FX adapter. Mappers validate records through domain factories on read.

**HTTP adapter (future):** `HttpExpenseRepository` implements the same port with DTO mapping and `API_BASE_URL`.
Later `SyncingExpenseRepository` decorator: IDB first, outbox, push on `online` (reason for UUIDs, `updatedAt`, `deletedAt`).

---

## 5. State management with signals

Stores are `@Service()` classes in `application/`: private `signal`s, public readonly `computed`s, async via
`resource()`, mutations via use cases. No NgRx.

```ts
@Service()
export class ExpensesStore {
  private repo = inject(EXPENSE_REPOSITORY);
  private reload = signal(0);
  private res = resource({ params: () => this.reload(), loader: () => this.repo.list() });
  readonly all = computed(() => (this.res.value() ?? []).filter(e => !e.deletedAt));
  readonly isLoading = computed(() => this.res.isLoading());
  readonly error = computed(() => this.res.error());
  readonly recentWhats = computed(() => /* top 8 distinct `what` by recency */);
  readonly recentPlaces = computed(() => /* top 8 distinct places */);
  async add(cmd: AddExpenseCommand): Promise<Result<Expense, DomainError>> { /* use case → res.update() optimistic → repo.save; rollback via reload */ }
  async remove(id: ExpenseId) { /* soft delete, lastDeleted signal for undo toast */ }
  async undoRemove() { /* restore */ }
}
```
- `CatalogStore`: `categories`, `activeCategories`, `methods`, `activeMethods`, `categoryById` (Map).
- `SettingsStore`: `settings` resource, `defaultCurrency`, `antExpenseThreshold`, `theme`; `update(patch)` via use case (rule 5).
- `InsightsStore` (reads `EXPENSE_SOURCE`, `ANT_THRESHOLD_SOURCE`, `CLOCK`):
  - `period = signal<'week'|'month'|'year'>('month')`, `anchor = signal(today)`, `range`, `previousRange`.
  - `currencies` = currencies present in range; `selectedCurrency = linkedSignal(() => defaultCurrency or first present)`.
  - Per-currency: `totals: CurrencyTotals`, and for `selectedCurrency`: `total`, `antTotal`, `antShare` %,
    `count`, `dailyAverage`, `projectedMonth`, `byDay`, `byWeek`, `byMonth`, `byCategory`, `byPlace`, `byMethod`
    (`{key,label,totalMinor,count,share}[]` desc), `topAnt` (top 5 `what+place` by count × total), `trend` (`{deltaPct,direction}` vs previous range).
  - `unclassifiedCount` (expenses in currencies ≠ threshold currency) shown as a hint.
  - Quick-add's today/week totals are NOT taken from insights (that would create an expenses→insights cycle);
    `ExpensesStore` exposes `todayTotals`/`weekTotals` built with `shared/kernel` `CurrencyTotals`.
  - All math lives in pure `insights/domain/expense-analytics.ts`, each function taking `(expenses, currency, ...)`.
- Page-local UI state (history `query`, `categoryFilter`) = `signal`s in the page; `computed` `filtered`/`groupedByDay`.
- Forms: Signal Forms (`form(model, schema)`) inside `expense-form` and `threshold-field`; domain factory is the final validator on submit.

---

## 6. Screens / routes & navigation

| Route | Feature / page | Content |
|---|---|---|
| `/add` | expenses · QuickAddPage | Today/week totals (stat-cards, default currency), big `amount-input`, `what` with recent chips, category & method chips, place with recent chips, collapsible date/time, note, "Cambiar moneda". Save → undo toast. Goal: ≤ 3 taps + amount. |
| `/history` | expenses · HistoryPage | search, category filter, list grouped by day (day totals per currency), tap → edit, swipe/long-press → delete. |
| `/history/:id` | expenses · ExpenseEditPage | prefilled `expense-form`, delete. |
| `/insights` | insights · InsightsPage | period segmented + prev/next, currency switcher (only if >1 currency), total + trend badge, ant share, bars by day, donut by category, ranked place/method, top ant list. |
| `/settings` | settings · SettingsPage | default currency, **ant threshold** with explanation, theme, links to Categorías / Métodos / Respaldo, storage-persist status, app version/update. |
| `/settings/categories`, `/settings/methods` | expenses · catalog pages | rename, emoji, color, archive. |
| `/settings/backup` | backup · BackupPage | export JSON/CSV, import JSON, "último respaldo hace N días". |

Shell `AppLayout`: `pp-app-header` (title from route `title`), `<router-outlet>`, fixed glass `pp-tab-bar`
(Agregar, Historial, Análisis, Ajustes) floating above the home indicator, toast host, install hint.
Charts are hand-rolled SVG components (small bundle, full glass styling control).

---

## 7. UI component catalog (OnPush, selector prefix `pp-`)

Presentational components take `Money`/view-models via `input()`, emit via `output()`/`model()`, never `inject()` stores.

### shared/ui — atoms
| Component | Inputs | Outputs / model | Responsibility |
|---|---|---|---|
| `pp-glass-surface` | `variant: 'card'\|'bar'\|'sheet'\|'chip'`, `elevation: 1\|2\|3`, `interactive` | — | Projection wrapper; all glass goes through it. |
| `pp-icon` | `name: IconName`, `size: 16\|20\|24\|28` | — | SVG sprite `<use>`, `aria-hidden`. |
| `pp-button` | `variant: 'primary'\|'ghost'\|'danger'`, `size`, `disabled`, `loading`, `type` | `pressed` | Pill button, ≥ 44px target. |
| `pp-icon-button` | `icon`, `label` (required), `variant` | `pressed` | Icon-only button with aria-label. |
| `pp-amount-text` | `money: Money`, `locale` (default `es-PE`), `emphasis: 'sm'\|'md'\|'xl'`, `signed` | — | `Intl.NumberFormat` currency format, tabular-nums. |
| `pp-chip` | `label`, `emoji?`, `color?`, `selected` | `toggled: boolean` | Selectable chip. |
| `pp-text-field` | `label`, `placeholder`, `maxLength`, `error?`, `inputmode`, `autocomplete` | `value = model<string>()`, `blurred` | Glass input, font-size ≥ 16px. |
| `pp-amount-input` | `currency: CurrencyCode`, `locale`, `autofocus` | `valueMinor = model<number\|null>()`, `submitted` | `inputmode="decimal"`; parses `"20.50"`→2050, `"20,50"`→2050 (single comma = decimal), `"1,250.50"`→125050 using currency exponent. |
| `pp-badge` | `tone: 'up'\|'down'\|'neutral'`, `text` | — | Trend/status pill. |
| `pp-skeleton` | `shape`, `lines` | — | Loading placeholder. |
| `pp-divider` | `inset` | — | 0.5px hairline. |
| `pp-toggle` | `label`, `disabled` | `checked = model<boolean>()` | iOS switch, `role="switch"`. |

### shared/ui — molecules & organisms
| Component | Inputs | Outputs / model | Responsibility |
|---|---|---|---|
| `pp-segmented-control` | `options: readonly {value,label}[]` | `value = model<string>()` | Sliding glass thumb. |
| `pp-stat-card` | `label`, `money: Money \| null`, `trend?: {deltaPct,direction}`, `hint?` | — | KPI tile. |
| `pp-empty-state` | `icon`, `title`, `message`, `actionLabel?` | `action` | Empty lists/insights. |
| `pp-toast` | `message`, `actionLabel?`, `durationMs` | `action`, `dismissed` | Glass toast above tab bar. |
| `pp-search-bar` | `placeholder` | `query = model<string>()` | Search input (debounce in container, 150 ms). |
| `pp-date-time-field` | `label`, `max` | `value = model<string>()` | `datetime-local` + "Ahora/Ayer". |
| `pp-tab-bar` (organism) | `items: readonly {path,label,icon}[]` | — | `routerLink`/`routerLinkActive`, safe-area bottom. |
| `pp-app-header` (organism) | `title`, `subtitle?`, `showBack` | `back` | Sticky glass header, safe-area top. |
| `pp-bottom-sheet` (organism) | `title` | `open = model<boolean>()`, `closed` | Native `<dialog>` glass sheet. |

### Feature components (presentational, live in `<feature>/ui/components`)
| Component | Feature | Inputs | Outputs / model |
|---|---|---|---|
| `pp-category-picker` | expenses | `categories: readonly Category[]` | `selectedId = model<CategoryId\|null>()` |
| `pp-method-picker` | expenses | `methods: readonly PaymentMethod[]` | `selectedId = model<PaymentMethodId\|null>()` |
| `pp-place-field` | expenses | `suggestions: readonly string[]` | `value = model<string>()` |
| `pp-expense-form` (organism) | expenses | `categories`, `methods`, `whatSuggestions`, `placeSuggestions`, `defaultCurrency`, `allowedCurrencies`, `initial?`, `submitLabel`, `busy` | `submitted: ExpenseFormValue`, `cancelled` |
| `pp-expense-row` | expenses | `row: ExpenseRowVm` (`id, what, money, categoryEmoji, categoryColor, place, methodName, timeLabel, isAnt`) | `opened: ExpenseId`, `deleteRequested: ExpenseId` |
| `pp-day-group` | expenses | `group: DayGroupVm` (`dayLabel, totals: readonly Money[], rows`) | `opened`, `deleteRequested` |
| `pp-expense-list` (organism) | expenses | `groups: readonly DayGroupVm[]`, `loading` | `opened`, `deleteRequested` (`@for track id`, `@defer (on viewport)`) |
| `pp-bar-chart` | insights | `series: readonly {key,label,value}[]`, `formatValue: (n:number)=>string`, `highlightKey?` | `selected: string` |
| `pp-donut-chart` | insights | `slices: readonly {key,label,value,color}[]`, `centerLabel` | `selected: string` |
| `pp-top-ant-list` | insights | `items: readonly {label,count,total: Money}[]` | `selected` |
| `pp-currency-switcher` | insights | `currencies: readonly CurrencyCode[]` | `value = model<CurrencyCode>()` |
| `pp-period-navigator` | insights | `label`, `canGoNext` | `prev`, `next` |
| `pp-threshold-field` | settings | `currency: CurrencyCode`, `locale` | `value = model<Money>()`, `saved` — renders helper text: *"Los gastos iguales o menores a este monto cuentan como gastos hormiga en Análisis."* |
| `pp-currency-select` | settings | `options: readonly CurrencyCode[]` | `value = model<CurrencyCode>()` |
| `pp-theme-select` | settings | — | `value = model<'system'\|'light'\|'dark'>()` |
| `pp-backup-reminder` | backup | `lastBackupAt: string \| null`, `now` | `exportRequested` |
| `pp-install-hint` | shell | `visible` | `dismissed` |

---

## 8. Glassmorphism design system + Tailwind v4 + iOS

**Palette revision (user, 2026-10-30):** matte light pastels (powder blue accent, peach secondary, slate-indigo ink), soft pastel gradient background (peach, powder blue, pink), lower saturation/gloss, Manrope Variable self-hosted via `@fontsource-variable/manrope`. The authoritative tokens live in `src/styles.css`; the snippet below was superseded.

Theme: `system` follows `matchMedia('(prefers-color-scheme: dark)')`; `shell/theme` effect sets `data-theme` and
`<meta name="theme-color">`. Text on glass ≥ 4.5:1 in both themes over the brightest gradient.

**iOS specifics**
- `background-attachment: fixed` is ignored on iOS → background is the fixed `.app-bg` div.
- Backdrop-filter is GPU-heavy: ≤ ~6 glass layers on screen; list rows are not glass (rows sit inside one card).
- Inputs ≥ 16px (no auto-zoom); `inputmode="decimal"`, `enterkeyhint="done"`.
- `100dvh`/`svh`, never `100vh`. Tab bar `bottom: calc(env(safe-area-inset-bottom) + 8px)`; pages pad bottom by tab height + inset.
- Hide tab bar while the keyboard is open (`visualViewport` resize → signal).
- 0.5px hairlines, SF font stack, `font-variant-numeric: tabular-nums` for amounts.

---

## 9. PWA plan

- `ng add @angular/pwa` → `@angular/service-worker`, `ngsw-config.json`, manifest, icons; then edit.
- `manifest.webmanifest`: `name "pica-pica — Gastos hormiga"`, `short_name "pica-pica"`, `start_url "/add"`, `scope "/"`,
  `display "standalone"`, `orientation "portrait"`, `theme_color`, `background_color`, `lang "es-PE"`,
  icons 192/512 + maskable 512, `shortcuts: [{ name: "Agregar gasto", url: "/add" }]`.
- `index.html` (`<html lang="es-PE">`):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="pica-pica">
<meta name="theme-color" content="#f5f7fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14141f" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<!-- apple-touch-startup-image per device (pwa-asset-generator) -->
<script>/* read localStorage 'pp-theme' → set data-theme before paint */</script>
```
- `ngsw-config.json`: `assetGroups` app (prefetch: index, js, css, manifest) + assets (lazy, `updateMode: prefetch`).
  No `dataGroups` in MVP; future `api` group with freshness, 5 s timeout.
- Offline: app is fully functional offline (IDB).
- Update flow (`shell/pwa/sw-update.service.ts`): `SwUpdate.versionUpdates` → `VERSION_READY` → `updateAvailable` signal →
  toast "Nueva versión — Actualizar" → `activateUpdate()` + reload; `checkForUpdate()` on `visibilitychange`; `unrecoverable` → reload.
- **iOS gotchas:** no `beforeinstallprompt` → `ios-install.service` detects iOS Safari not standalone → `pp-install-hint`
  ("Compartir → Agregar a inicio"). Safari may evict storage of sites unused ~7 days; installed apps fare better but
  call `navigator.storage.persist()` and nudge **backups** (`pp-backup-reminder` after 14 days). Home-screen app storage
  is separate from the Safari tab. No background sync. `black-translucent` puts content under the notch → safe-area padding mandatory.
  Splash screens need `apple-touch-startup-image` per resolution. Push notifications out of scope.

---

## 10. Testing strategy

Vitest via `ng test` (`@angular/build:unit-test`, jsdom); specs co-located (`x.spec.ts` next to `x.ts`).
Zoneless TestBed: `await fixture.whenStable()` / `TestBed.tick()`; never `fakeAsync`. `fake-indexeddb` for IDB tests.

| Layer | What | How |
|---|---|---|
| `shared/kernel` | `Money` (PEN exponent 2, JPY 0, mismatch error), `CurrencyTotals`, `Result` | Plain Vitest, 100%. |
| `<f>/domain` | VO factories, rules 1–8, every analytics fn (ISO weeks Monday, month/year boundaries, per-currency grouping, ant/unclassified split, trend, projectedMonth) | Plain Vitest, builders from `shared/testing`. ≥ 95%. |
| `<f>/application` | use cases + stores (optimistic add, rollback, undo, threshold rule 5, insights react to new expense and threshold change) | TestBed with `provideX({persistence:'memory'})`, fake `CLOCK`. |
| `<f>/infrastructure` | `expense.repository.contract.ts` run against memory + IDB (+ HTTP via `HttpTestingController` later); settings repo round-trip | `fake-indexeddb/auto`. Proves swappability. |
| `<f>/ui/components`, `shared/ui` | inputs render, outputs emit, `model` two-way, a11y attrs, es-PE formatting `S/ 20.00` | `fixture.componentRef.setInput()`. |
| `<f>/ui/pages` | container wiring (quick-add saves + toast; history grouping; insights period/currency switch; settings threshold save) | memory adapters, `RouterTestingHarness`. |
| architecture | `pnpm lint` fails on a forbidden import (fixture file in a test) | ESLint boundaries. |
| e2e | add → history → insights; offline reload; iPhone viewport | Playwright WebKit + manual device checklist. |

---

## 11. Implementation plan (ordered work units, each ≤ ~400 changed lines, one commit each)

Every WU: `pnpm lint`, `pnpm ng test --watch=false`, `pnpm ng build` green; Conventional Commit; specs co-located.

1. **WU-01 Scaffold** — `pnpm dlx @angular/cli@22 new pica-pica --package-manager=pnpm --style=css --routing --ssr=false` in place; Node 24; ensure no `zone.js` (`pnpm why zone.js` empty); `provideZonelessChangeDetection()`, `provideBrowserGlobalErrorListeners()`, `LOCALE_ID 'es-PE'` + `registerLocaleData(localeEsPE)`; strict TS; empty root folders `expenses/ insights/ settings/ backup/ shell/ shared/` with `index.ts`. AC: boots, Vitest runs.
2. **WU-02 Aliases + boundaries lint** — `tsconfig` `@pp/*` paths; `angular-eslint` + `eslint-plugin-boundaries` config per §3c; a spec proving a forbidden import is reported. AC: `pnpm lint` green and catches violations.
3. **WU-03 Tailwind v4 + tokens** — install `tailwindcss @tailwindcss/postcss postcss`; `.postcssrc.json`; `styles.css` §8; theme pre-paint script; `.app-bg`. AC: built CSS contains `-webkit-backdrop-filter`; dark via `data-theme`.
4. **WU-04 Shared kernel** — `money.ts`, `currency.ts`, `currency-totals.ts`, `result.ts`, `domain-error.ts`, `brand.ts`, `clock.ts`, `id-generator.ts`, `shared/testing`. AC: `Money.of(20,'PEN').amountMinor===2000`; adding PEN+USD returns `CurrencyMismatchError`; totals keep currencies separate.
5. **WU-05 shared/ui atoms A** — `glass-surface`, `icon` (sprite), `button`, `icon-button`, `divider`, `skeleton`, `badge`. AC: specs.
6. **WU-06 shared/ui atoms B** — `amount-text` (`S/ 20.00` in es-PE), `chip`, `text-field`, `amount-input` (parsing cases §7), `toggle`. AC: specs.
7. **WU-07 shared/persistence** — `idb-database.ts` schema v1 (§4 table incl. compound index), migration runner, `storage-persist.ts`, `provideShared()`; `fake-indexeddb`. AC: opens, stores/indexes exist.
8. **WU-08 settings core** — domain `AppSettings` (defaults PEN, threshold S/ 20.00, Monday), rules (threshold > 0, rule 5), port, IDB + memory repos, `SettingsStore`, `update-settings`, `provideSettings`, public API. AC: defaults on empty DB; currency change without new threshold rejected.
9. **WU-09 expenses domain** — VOs, `Expense` factory (own currency), catalog entities + seeds (Peru), errors. AC: rules 1, 2, 6, 7.
10. **WU-10 expenses ports + adapters** — ports, tokens, contract suite, memory + IDB repos, mappers, `provideExpenses`, seed initializer. AC: contract green on both adapters.
11. **WU-11 expenses stores + use cases** — `ExpensesStore`, `CatalogStore`, add/update/delete/restore/archive, `recentWhats/Places`. AC: optimistic/rollback/undo specs; new expense defaults to `SettingsStore.defaultCurrency`.
12. **WU-12 shell + shared molecules/organisms** — `segmented-control`, `stat-card`, `empty-state`, `toast`, `search-bar`, `date-time-field`, `tab-bar`, `app-header`, `bottom-sheet`; `AppLayout`, `tab-items`, theme effect, `app.routes.ts` composition with placeholder pages. AC: tab navigation, lazy chunks per page in build output.
13. **WU-13 expenses quick-add** — `category-picker`, `method-picker`, `place-field`, `expense-form` (Signal Forms, currency preset PEN), `QuickAddPage` (today/week totals per currency). AC: save in ≤ 3 taps + amount; persisted after reload; undo.
14. **WU-14 expenses history + edit** — `expense-row` (isAnt via threshold passed from page), `day-group`, `expense-list`, `HistoryPage`, `ExpenseEditPage`. AC: search/filter, edit, delete + undo, day totals never mix currencies.
15. **WU-15 insights domain** — `period.ts` (Monday weeks), `expense-analytics.ts` per currency, ant/unclassified split, trend, topAnt, `fx-rate.port.ts` interface only. AC: full domain specs incl. mixed PEN/USD data never summed together.
16. **WU-16 insights store + ACL + page** — `EXPENSE_SOURCE`/`ANT_THRESHOLD_SOURCE` adapters over `@pp/expenses`/`@pp/settings`, `InsightsStore`, `bar-chart`, `donut-chart`, `top-ant-list`, `currency-switcher`, `period-navigator`, `InsightsPage`, `provideInsights`. AC: changing threshold in settings updates ant share live; switcher hidden with one currency.
17. **WU-17 settings UI + catalog pages** — `threshold-field` (helper text §7), `currency-select`, `theme-select`, `SettingsPage`; expenses `catalog-categories`/`catalog-methods` pages under `/settings/*`. AC: threshold edit persists as Money; archive rule enforced.
18. **WU-18 backup feature** — backup domain (`schemaVersion: 1`, validation via domain factories), export JSON/CSV (lazy via `injectAsync`), import JSON, `lastBackupAt`, `backup-reminder`, `/settings/backup`. AC: export → wipe → import round-trip deep-equal, currencies preserved.
19. **WU-19 PWA** — `ng add @angular/pwa`, manifest/meta §9, icons + splash, `sw-update.service`, `ios-install.service`, `install-hint`. AC: installable (Lighthouse), offline reload, iOS standalone with correct status bar.
20. **WU-20 E2E + polish** — Playwright WebKit flows, a11y pass, ≤ 6 glass layers, `angular.json` budget initial ≤ 250 kB. AC: e2e green, budgets pass.

---

## 12. Open questions / non-goals

Decided: currency **PEN (S/)**, locale **es-PE**, weeks start **Monday**, ant threshold **user-editable, default S/ 20.00**,
multi-currency-ready data model (per-expense currency, per-currency analytics, no conversion).

Open: whether the MVP UI should already let users pick a non-default currency per expense (design supports it; default: hidden behind "Cambiar moneda").

Non-goals (MVP): FX conversion/rates provider, backend, auth, sync, multi-device, budgets/alerts, receipts/photos,
geolocation, push notifications, recurring expenses, bank import, SSR, UI languages other than Spanish, NgRx.
Growth path: `HttpExpenseRepository` + `SyncingExpenseRepository` behind the same ports, an `FX_RATE_PORT` adapter
(+ `fxRates` store) enabling converted totals, `dataGroups` in ngsw, auth interceptor — no presentation changes.
