# pica-pica — Architecture Design

Mobile-first, installable (iOS) PWA for tracking "ant expenses" (gastos hormiga): small, frequent
spends. MVP is 100% local (IndexedDB); the design keeps a backend swap invisible to the UI.

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
| E2E (optional, WU-14) | Playwright, WebKit project for iOS-like checks | latest |

Angular 22 facts relied upon: Signal Forms stable; `resource()`, `rxResource()`, `httpResource()` stable;
`@Service` shorthand for root `@Injectable`; `ChangeDetectionStrategy.Eager` alias of `Default`.
Zoneless: new CLI projects are zoneless; we still call `provideZonelessChangeDetection()` explicitly
and never install `zone.js` (no `fakeAsync`/`waitForAsync` in tests — they need zone.js).

Rules: standalone everywhere, `ChangeDetectionStrategy.OnPush` on every component (explicit, cheap),
`input()/output()/model()/viewChild()`, `@if/@for/@switch/@defer`, `inject()` only (no constructor DI),
no `NgModule`, no RxJS in app state (RxJS only inside HTTP adapter if needed).

---

## 2. Domain model

All domain code is framework-free TypeScript (no `@angular/*` imports) under `domain/`.

### Value objects (immutable, validated in factory, `readonly`)
- `ExpenseId` — branded `string` (`crypto.randomUUID()`); client-generated so offline creates sync later.
- `Money` — `{ amountMinor: number /* integer */, currency: CurrencyCode }`. Integer minor units avoid
  float errors. Minor-unit exponent from `Intl.NumberFormat(..., {currency}).resolvedOptions().maximumFractionDigits`
  (CLP=0, USD=2). Ops: `add`, `isPositive`, `format(locale)`. Rule: `amountMinor > 0`, max 1e12.
- `CurrencyCode` — ISO-4217 3 letters; app-wide default from Settings (single currency in MVP).
- `OccurredAt` — ISO-8601 string with offset (`2026-10-30T08:15:00-03:00`); helpers `localDayKey()`
  (`YYYY-MM-DD`), `isoWeekKey()`, `monthKey()`. Rule: not more than 1 day in the future.
- `PlaceName` — trimmed string 1..60 chars, optional; stored normalized key (`lowercase`, no accents)
  for grouping. Optional `GeoPoint {lat,lng}` reserved (non-goal in MVP).
- `Note` — trimmed string 0..280.

### Entities
```ts
interface Expense {
  readonly id: ExpenseId;
  readonly what: string;            // 1..60 chars, "Café", "Chicle"
  readonly amount: Money;
  readonly categoryId: CategoryId;  // "que cosas"
  readonly paymentMethodId: PaymentMethodId; // "como"
  readonly place: PlaceName | null; // "donde"
  readonly occurredAt: OccurredAt;  // "cuando"
  readonly note: Note | null;
  readonly createdAt: string; readonly updatedAt: string; // ISO, for sync/conflict
  readonly deletedAt: string | null; // soft delete -> future sync tombstones
}
interface Category { id: CategoryId; name: string; emoji: string; color: TokenColor; archived: boolean; }
interface PaymentMethod { id: PaymentMethodId; name: string; kind: 'cash'|'debit'|'credit'|'transfer'|'wallet'|'other'; archived: boolean; }
```
Seed categories: Café, Snacks, Transporte, Delivery, Suscripciones, Antojos, Kiosco, Otros.
Seed methods: Efectivo, Débito, Crédito, Transferencia, Wallet (Apple Pay).

### Domain rules
1. An expense requires `what`, `amount>0`, `categoryId`, `paymentMethodId`, `occurredAt`.
2. Archived categories/methods cannot be picked for new expenses but remain valid on old ones.
3. Deleting a category with expenses is forbidden → archive instead (`CategoryInUseError`).
4. Delete expense = soft delete; lists and analytics ignore `deletedAt != null`; undo within 5 s restores.
5. "Ant expense" threshold: `amount <= settings.antThresholdMinor` (default 5 000 CLP). Analytics
   flag ant vs non-ant; app still accepts any amount.
6. Errors are typed: `DomainError` subclasses (`InvalidMoneyError`, `InvalidExpenseError`, ...). Factories
   return `Result<T, DomainError>` (`{ok:true,value}|{ok:false,error}`) — no throwing across layers.

### Pure domain services (`domain/services/`)
`ExpenseAnalytics` — pure functions over `readonly Expense[]`: `totalOf`, `groupSum(by)`, `byDay`,
`byWeek`, `byMonth`, `byCategory`, `byPlace`, `byMethod`, `topAnt(n)`, `trend(periodA, periodB)`
(delta % between current and previous equal-length period), `dailyAverage`, `projectedMonth`.
These are the heart of tests and are reused by the signal store `computed`s.

---

## 3. Folder structure (screaming architecture)

```
pica-pica/
├─ angular.json  package.json  pnpm-lock.yaml  tsconfig*.json  .postcssrc.json  ngsw-config.json
├─ public/                      # copied as-is
│  ├─ manifest.webmanifest
│  ├─ icons/  (icon-192.png icon-512.png maskable-512.png apple-touch-icon-180.png favicon.svg)
│  └─ splash/ (apple-splash-*.png, generated)
├─ docs/architecture.md
└─ src/
   ├─ index.html  main.ts  styles.css           # styles.css = Tailwind v4 @import + @theme tokens
   ├─ app/
   │  ├─ app.config.ts  app.routes.ts  app.ts    # shell: <router-outlet> + bottom tab bar
   │  ├─ core/                                   # cross-cutting, no business logic
   │  │  ├─ persistence/ idb-database.ts (open, schema, migrations)  storage-persist.ts
   │  │  ├─ pwa/ sw-update.service.ts  ios-install.service.ts
   │  │  ├─ platform/ clock.ts (CLOCK token)  id-generator.ts (ID_GENERATOR token)
   │  │  └─ i18n/ locale.ts (LOCALE_ID es-CL, registerLocaleData)
   │  ├─ shared/
   │  │  ├─ domain/ result.ts  domain-error.ts  brand.ts
   │  │  └─ ui/                                  # atomic design, presentational ONLY
   │  │     ├─ atoms/   glass-surface/ icon/ button/ icon-button/ amount-text/ chip/ text-field/
   │  │     │           amount-input/ badge/ skeleton/ divider/ toggle/
   │  │     ├─ molecules/ category-picker/ method-picker/ date-time-field/ place-field/
   │  │     │             expense-row/ stat-card/ segmented-control/ empty-state/ toast/ search-bar/
   │  │     └─ organisms/ tab-bar/ app-header/ expense-form/ expense-list/ day-group/
   │  │                   bar-chart/ donut-chart/ top-ant-list/ bottom-sheet/ install-hint/
   │  └─ features/
   │     ├─ expenses/                            # bounded context: Expenses
   │     │  ├─ domain/ expense.ts money.ts occurred-at.ts place-name.ts category.ts payment-method.ts
   │     │  │          expense-analytics.ts errors.ts
   │     │  ├─ application/
   │     │  │  ├─ ports/ expense.repository.ts  catalog.repository.ts   # interfaces + InjectionTokens
   │     │  │  ├─ use-cases/ add-expense.ts update-expense.ts delete-expense.ts restore-expense.ts
   │     │  │  │             list-expenses.ts archive-category.ts
   │     │  │  └─ expenses.store.ts  catalog.store.ts  analytics.store.ts   # signal facades
   │     │  ├─ infrastructure/
   │     │  │  ├─ indexeddb/ idb-expense.repository.ts idb-catalog.repository.ts expense.mapper.ts
   │     │  │  ├─ memory/ in-memory-expense.repository.ts  (tests + storybook-like dev)
   │     │  │  ├─ http/  http-expense.repository.ts  (stub, future)  expense.dto.ts
   │     │  │  └─ expenses.providers.ts            # provideExpensesInfrastructure(kind)
   │     │  └─ presentation/
   │     │     ├─ quick-add/ quick-add.page.ts (container)
   │     │     ├─ history/  history.page.ts  expense-edit.page.ts
   │     │     ├─ insights/ insights.page.ts
   │     │     └─ expenses.routes.ts
   │     └─ settings/
   │        ├─ domain/ settings.ts (currency, antThreshold, theme)
   │        ├─ application/ ports/settings.repository.ts  settings.store.ts  export-data.ts import-data.ts
   │        ├─ infrastructure/ idb-settings.repository.ts  settings.providers.ts
   │        └─ presentation/ settings.page.ts  settings.routes.ts
   └─ testing/ expense.builder.ts  fake-clock.ts  test-providers.ts
```
Dependency rule (enforced by review + optional `eslint-plugin-boundaries`):
`presentation → application → domain`; `infrastructure → application(ports) + domain`;
`domain` imports nothing but `shared/domain`. `shared/ui` imports nothing from `features/`.
Containers = `*.page.ts` (inject stores, no styling logic). Everything in `shared/ui` = presentational
(inputs/outputs only, no `inject()` of stores/services).

---

## 4. Ports & adapters

```ts
// features/expenses/application/ports/expense.repository.ts
export interface ExpenseQuery { from?: string; to?: string; includeDeleted?: boolean; }
export interface ExpenseRepository {
  list(q?: ExpenseQuery): Promise<readonly Expense[]>;
  get(id: ExpenseId): Promise<Expense | null>;
  save(e: Expense): Promise<void>;            // upsert
  saveMany(e: readonly Expense[]): Promise<void>; // import
  softDelete(id: ExpenseId, at: string): Promise<void>;
  restore(id: ExpenseId): Promise<void>;
}
export const EXPENSE_REPOSITORY = new InjectionToken<ExpenseRepository>('ExpenseRepository');
// CatalogRepository: listCategories/saveCategory/listMethods/saveMethod — CATALOG_REPOSITORY
// SettingsRepository: load(): Promise<Settings>; save(s): Promise<void> — SETTINGS_REPOSITORY
```
Promise-based (not Observable) so both IDB and `fetch`/`HttpClient.firstValueFrom` fit, and stores
wrap them with `resource()`.

**Why IndexedDB over localStorage:** async (no main-thread jank), structured data + indexes
(`by_occurredAt`, `by_category`), far larger quota (localStorage ~5 MB string-only), transactional,
available in iOS standalone PWAs and in Service Workers (future background sync). localStorage only
keeps the tiny `theme` hint for flash-free first paint.

**IndexedDB adapter** (`core/persistence/idb-database.ts`): DB `pica-pica`, version 1, stores
`expenses` (keyPath `id`, indexes `by_occurredAt`, `by_categoryId`, `by_deletedAt`), `categories`,
`paymentMethods`, `settings` (keyPath `key`), `meta` (schemaVersion, seededAt). `upgrade()` runs
ordered migrations `[v1]`; seeding happens once in a use case on first boot. Mappers convert
domain ↔ record (records are plain JSON; `Money` stored as `{amountMinor,currency}`).
On boot call `navigator.storage.persist()` (`storage-persist.ts`) and surface the result in Settings.

**HTTP adapter (future)**: `HttpExpenseRepository` implements the same port with `HttpClient`
(`firstValueFrom`), DTO mapper, `API_BASE_URL` token. Later a `SyncingExpenseRepository` decorator
(IDB first, outbox queue, push on `online`) — reason for client UUIDs, `updatedAt`, `deletedAt`.

**Swapping** — one line in `app.config.ts`:
```ts
export function provideExpensesInfrastructure(kind: 'indexeddb'|'memory'|'http'): EnvironmentProviders {
  const impl = { indexeddb: IdbExpenseRepository, memory: InMemoryExpenseRepository, http: HttpExpenseRepository }[kind];
  return makeEnvironmentProviders([{ provide: EXPENSE_REPOSITORY, useClass: impl }, /* catalog too */]);
}
```
Kind comes from `environment.ts` (`persistence: 'indexeddb'`). Tests use `'memory'`.

---

## 5. State management with signals

Stores are `@Service()` (root) classes in `application/`. Private `signal`s, public readonly
`computed`s, async via `resource()`, mutations via use cases. No NgRx; optional later.

```ts
@Service()
export class ExpensesStore {
  private repo = inject(EXPENSE_REPOSITORY);
  private reloadTick = signal(0);
  readonly expensesRes = resource({ params: () => ({ t: this.reloadTick() }), loader: () => this.repo.list() });
  readonly all = computed(() => (this.expensesRes.value() ?? []).filter(e => !e.deletedAt));
  readonly isLoading = computed(() => this.expensesRes.isLoading());
  readonly error = computed(() => this.expensesRes.error());
  async add(cmd: AddExpenseCommand): Promise<Result<Expense, DomainError>> { /* use case → optimistic update via expensesRes.update() → repo.save */ }
  async remove(id: ExpenseId) { /* soft delete + lastDeleted signal for undo toast */ }
  async undoRemove() { ... }
}
```
- Optimistic updates: `expensesRes.update(list => [...])` then persist; on failure `reloadTick.update(n=>n+1)` and toast.
- `CatalogStore`: `categories`, `activeCategories`, `methods`, `activeMethods`, `categoryById` (Map computed).
- `SettingsStore`: `settings` resource, `currency`, `antThresholdMinor`, `theme` (`'system'|'light'|'dark'`);
  an `effect()` applies `data-theme` on `<html>` and updates `<meta name="theme-color">`.
- `AnalyticsStore` (depends on ExpensesStore + SettingsStore + CLOCK):
  - `period = signal<'week'|'month'|'year'>('month')`, `anchor = signal(today)`.
  - `inPeriod`, `previousPeriod` computed ranges.
  - `total`, `antTotal`, `antShare` (%), `count`, `dailyAverage`, `projectedMonth`.
  - `byDay`, `byWeek`, `byMonth`, `byCategory`, `byPlace`, `byMethod` → `{key,label,totalMinor,count,share}[]` sorted desc.
  - `topAnt` (top 5 "what+place" by frequency × total), `trend` (`{deltaPct, direction}` vs previous period).
  - `todayTotal`, `weekTotal`, `monthTotal` for the quick-add header.
  All delegate to pure `expense-analytics.ts` so the logic is unit-tested without Angular.
- History filters live in the page container as `signal`s (`query`, `categoryFilter`), with
  `computed` `filtered` and `groupedByDay`. `linkedSignal` resets selection when filters change.
- Forms: **Signal Forms** (stable in v22) — `form(model, schema)` in `expense-form` container usage;
  schema mirrors domain rules (required, min). Domain factory remains the source of truth on submit.

---

## 6. Screens / routes & navigation

```ts
// app.routes.ts
[{ path: '', pathMatch: 'full', redirectTo: 'add' },
 { path: 'add',      loadComponent: () => import('./features/expenses/presentation/quick-add/quick-add.page') , title: 'Agregar' },
 { path: 'history',  loadChildren:  () => import('./features/expenses/presentation/expenses.routes') },   // '' list, ':id' edit
 { path: 'insights', loadComponent: () => import('./features/expenses/presentation/insights/insights.page'), title: 'Análisis' },
 { path: 'settings', loadChildren:  () => import('./features/settings/presentation/settings.routes') },
 { path: '**', redirectTo: 'add' }]
```
`provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withInMemoryScrolling({scrollPositionRestoration:'enabled'}), withPreloading(PreloadAllModules))`.
Pages use `export default`.

| Route | Container | Content |
|---|---|---|
| `/add` | QuickAddPage | Today/week totals (stat-cards), big `amount-input` (numeric keypad), `what` field with recent-suggestions chips, category chips, method chips, place field with recent places, collapsible date/time + note. Save → toast with "Deshacer". Target: add in ≤ 3 taps + amount. |
| `/history` | HistoryPage | search-bar, category filter chips, `expense-list` grouped by day with day totals; swipe/long-press → edit/delete. |
| `/history/:id` | ExpenseEditPage | `expense-form` prefilled (bottom-sheet style), delete button. |
| `/insights` | InsightsPage | segmented week/month/year, prev/next anchor, total + trend badge, ant share, bar chart by day, donut by category, ranked lists by place/method, top-ant list. |
| `/settings` | SettingsPage | currency, ant threshold, theme, manage categories/methods (rename/emoji/archive), export JSON/CSV, import JSON, storage persistence status, app version + "update available". |

Shell (`app.ts`): `app-header` (per-route title via `Title`), `<router-outlet>`, fixed `tab-bar`
(4 tabs: Agregar ➕, Historial, Análisis, Ajustes) floating glass pill above the home indicator,
`toast` host, `install-hint`. Charts: hand-rolled SVG organisms (no chart lib → small bundle, full
glass styling control); revisit if needs grow.

---

## 7. UI component catalog (atomic design, all presentational, OnPush, selector prefix `pp-`)

### Atoms
| Component | Inputs | Outputs / model | Responsibility |
|---|---|---|---|
| `pp-glass-surface` | `variant: 'card'\|'bar'\|'sheet'\|'chip'`, `elevation: 1\|2\|3`, `interactive: boolean` | — | Content projection wrapper applying glass tokens; all glass goes through it. |
| `pp-icon` | `name: IconName`, `size: 16\|20\|24\|28` | — | Inline SVG sprite (`<use href>`), `aria-hidden` default. |
| `pp-button` | `variant: 'primary'\|'ghost'\|'danger'`, `size`, `disabled`, `loading`, `type` | `pressed: void` | Pill button, 44px min hit area, haptic-like scale press. |
| `pp-icon-button` | `icon`, `label` (required, aria), `variant` | `pressed` | Icon-only button. |
| `pp-amount-text` | `amountMinor: number`, `currency`, `locale`, `emphasis: 'sm'\|'md'\|'xl'`, `signed` | — | Formats Money via `Intl.NumberFormat`, tabular-nums. |
| `pp-chip` | `label`, `emoji?`, `color?`, `selected` | `toggled: boolean` | Selectable chip. |
| `pp-text-field` | `label`, `placeholder`, `maxLength`, `error?`, `autocomplete`, `inputmode` | `value = model<string>()`, `blurred` | Glass input, font-size ≥16px (prevents iOS zoom). |
| `pp-amount-input` | `currency`, `locale`, `autofocus` | `valueMinor = model<number\|null>()`, `submitted` | `inputmode="decimal"`, parses locale input to minor units, large display. |
| `pp-badge` | `tone: 'up'\|'down'\|'neutral'`, `text` | — | Trend / status pill. |
| `pp-skeleton` | `shape: 'line'\|'card'\|'circle'`, `lines` | — | Loading placeholder (respect reduced motion). |
| `pp-divider` | `inset: boolean` | — | Hairline 0.5px divider. |
| `pp-toggle` | `label`, `disabled` | `checked = model<boolean>()` | iOS-style switch, `role="switch"`. |

### Molecules
| Component | Inputs | Outputs / model | Responsibility |
|---|---|---|---|
| `pp-category-picker` | `categories: readonly Category[]` | `selectedId = model<CategoryId\|null>()` | Horizontal scroll chips (scroll-snap). |
| `pp-method-picker` | `methods: readonly PaymentMethod[]` | `selectedId = model<PaymentMethodId\|null>()` | Same, with kind icons. |
| `pp-date-time-field` | `label`, `max: string` | `value = model<string>()` | Native `datetime-local`; "Ahora/Ayer" shortcuts. |
| `pp-place-field` | `suggestions: readonly string[]` | `value = model<string>()` | Text field + recent-place chips. |
| `pp-search-bar` | `placeholder` | `query = model<string>()` | Debounce via `debounced()` is experimental → use plain signal + 150ms `setTimeout` in container. |
| `pp-segmented-control` | `options: readonly {value,label}[]` | `value = model<string>()` | Period switch, sliding glass thumb. |
| `pp-stat-card` | `label`, `amountMinor`, `currency`, `locale`, `trend?: {deltaPct,direction}`, `hint?` | — | KPI tile. |
| `pp-expense-row` | `expense: ExpenseRowVm` (`what, amountMinor, currency, categoryEmoji, categoryColor, place, methodName, timeLabel, isAnt`) | `opened: ExpenseId`, `deleteRequested: ExpenseId` | List row; containers map domain → VM. |
| `pp-empty-state` | `icon`, `title`, `message`, `actionLabel?` | `action` | Empty lists/insights. |
| `pp-toast` | `message`, `actionLabel?`, `durationMs` | `action`, `dismissed` | Glass toast above tab bar (undo). |

### Organisms
| Component | Inputs | Outputs / model | Responsibility |
|---|---|---|---|
| `pp-tab-bar` | `items: readonly {path,label,icon}[]` | — | Uses `routerLink`/`routerLinkActive` (allowed: router directives only), fixed bottom, safe-area. |
| `pp-app-header` | `title`, `subtitle?` | `back?` (output) | Sticky glass header with `env(safe-area-inset-top)`. |
| `pp-expense-form` | `categories`, `methods`, `placeSuggestions`, `whatSuggestions`, `currency`, `locale`, `initial?: ExpenseFormValue`, `submitLabel`, `busy` | `submitted: ExpenseFormValue`, `cancelled` | Composes molecules; owns Signal Form; emits plain value (container calls use case). |
| `pp-expense-list` | `groups: readonly DayGroupVm[]`, `loading` | `opened`, `deleteRequested` | `@for` with `track id`, `@defer (on viewport)` for long history. |
| `pp-day-group` | `group: DayGroupVm` (`dayLabel, totalMinor, rows`) | `opened`, `deleteRequested` | Sticky day header + rows. |
| `pp-bar-chart` | `series: readonly {key,label,value}[]`, `formatValue: (n)=>string`, `highlightKey?` | `selected: string` | SVG bars, accessible `<title>`/table fallback. |
| `pp-donut-chart` | `slices: readonly {key,label,value,color}[]`, `centerLabel` | `selected: string` | SVG donut + legend. |
| `pp-top-ant-list` | `items: readonly {label,count,totalMinor}[]`, `currency`, `locale` | `selected` | Ranked "fugas" list. |
| `pp-bottom-sheet` | `open = model<boolean>()`, `title` | `closed` | Glass sheet (native `<dialog>`), drag handle, safe-area bottom. |
| `pp-install-hint` | `visible: boolean` | `dismissed` | iOS "Compartir → Agregar a inicio" instructions. |

---

## 8. Glassmorphism design system + Tailwind v4 + iOS

`src/styles.css` (Tailwind v4, CSS-first; `.postcssrc.json` → `{"plugins":{"@tailwindcss/postcss":{}}}`):
```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
  --color-accent: oklch(0.72 0.17 160);      /* mint */
  --color-accent-2: oklch(0.70 0.19 300);    /* violet */
  --color-danger: oklch(0.65 0.22 25);
  --color-ink: oklch(0.22 0.02 260);  --color-ink-muted: oklch(0.45 0.02 260);
  --radius-glass: 1.25rem; --radius-pill: 999px;
  --blur-glass: 20px; --blur-glass-strong: 32px;
  --shadow-glass: 0 8px 32px -8px rgb(15 23 42 / 0.25), inset 0 1px 0 rgb(255 255 255 / 0.45);
}

:root {                         /* light */
  --glass-bg: rgb(255 255 255 / 0.55); --glass-bg-strong: rgb(255 255 255 / 0.72);
  --glass-border: rgb(255 255 255 / 0.65); --glass-sat: 180%;
  --glass-fallback: rgb(248 250 252 / 0.94);
  --app-bg: radial-gradient(60% 50% at 10% 0%, oklch(0.88 0.12 160 / .9), transparent 70%),
            radial-gradient(50% 45% at 100% 20%, oklch(0.85 0.13 300 / .8), transparent 70%),
            radial-gradient(70% 60% at 50% 110%, oklch(0.9 0.1 60 / .8), transparent 70%),
            oklch(0.97 0.01 250);
}
[data-theme=dark] {
  --glass-bg: rgb(30 30 46 / 0.45); --glass-bg-strong: rgb(30 30 46 / 0.65);
  --glass-border: rgb(255 255 255 / 0.12); --glass-sat: 160%;
  --glass-fallback: rgb(24 24 36 / 0.95);
  --app-bg: radial-gradient(60% 50% at 10% 0%, oklch(0.45 0.12 160 / .7), transparent 70%),
            radial-gradient(50% 45% at 100% 20%, oklch(0.40 0.15 300 / .7), transparent 70%),
            oklch(0.16 0.02 270);
}

@utility glass {
  background: var(--glass-bg);
  border: 0.5px solid var(--glass-border);
  border-radius: var(--radius-glass);
  box-shadow: var(--shadow-glass);
  -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(var(--glass-sat));  /* Safari needs prefix */
  backdrop-filter: blur(var(--blur-glass)) saturate(var(--glass-sat));
}
@utility glass-strong { /* same, --glass-bg-strong + --blur-glass-strong (tab bar, sheets) */ }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass, .glass-strong { background: var(--glass-fallback); }
}
@media (prefers-reduced-transparency: reduce) { .glass, .glass-strong { background: var(--glass-fallback); -webkit-backdrop-filter:none; backdrop-filter:none; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }

html { background: var(--app-bg) fixed; color-scheme: light dark; -webkit-text-size-adjust: 100%; }
body { min-height: 100dvh; padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
       -webkit-tap-highlight-color: transparent; overscroll-behavior-y: none; font-family: var(--font-sans); }
```
Theme: `system` uses `matchMedia('(prefers-color-scheme: dark)')` signal → sets `data-theme`.
Contrast: text on glass ≥ 4.5:1 (ink tokens tested in both themes over the brightest gradient).

**iOS specifics (must-haves)**
- `background-attachment: fixed` is ignored on iOS: render background as a `position:fixed; inset:0; z-index:-1` div instead (WU-03).
- Backdrop-filter is GPU-heavy: limit to ≤ ~6 simultaneous glass layers on screen; list rows are NOT glass
  (rows sit inside one glass card). Avoid glass inside scroll containers with `transform` animations.
- Inputs font-size ≥ 16px (no auto-zoom). `inputmode="decimal"`, `enterkeyhint="done"`.
- Use `100dvh`/`svh`, never `100vh`. Tab bar: `bottom: calc(env(safe-area-inset-bottom) + 8px)`; page bottom padding = tab height + inset.
- Keyboard: tab bar hides when an input is focused (`visualViewport` resize signal) to avoid floating over keyboard.
- Hairlines `0.5px`, SF font stack, `font-variant-numeric: tabular-nums` for amounts.
- `:active` states need `ontouchstart` noop or use `:active` + `-webkit-tap-highlight-color:transparent` (Angular `(touchstart)` on host not needed in modern iOS; verify on device).

---

## 9. PWA plan

- `ng add @angular/pwa` → adds `@angular/service-worker`, `ngsw-config.json`, manifest, icons; then edit.
- `app.config.ts`: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`.
- `manifest.webmanifest`: `name "pica-pica — Gastos hormiga"`, `short_name "pica-pica"`, `start_url "/add"`,
  `scope "/"`, `display "standalone"`, `orientation "portrait"`, `theme_color`, `background_color`,
  `lang "es-CL"`, icons 192/512 + `purpose: "maskable"` 512, `shortcuts: [{name:"Agregar gasto", url:"/add"}]`.
- `index.html` head:
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
<!-- apple-touch-startup-image links per device size (generated by pwa-asset-generator, WU-13) -->
<script>/* inline: read localStorage 'pp-theme' → set data-theme before paint */</script>
```
- `ngsw-config.json`: `assetGroups` app (prefetch: index, js, css, manifest) + assets (lazy, `updateMode: prefetch`: icons, splash, fonts).
  No `dataGroups` in MVP (no API). Future: `dataGroups` `api` freshness, maxAge 1d, timeout 5s.
- Offline: whole app works offline by design (IDB). Navigation fallback via `navigationUrls` default.
- Update flow (`sw-update.service.ts`): `SwUpdate.versionUpdates` filtered to `VERSION_READY` → `updateAvailable` signal →
  toast "Nueva versión — Actualizar" → `activateUpdate()` then `document.location.reload()`. Check `checkForUpdate()`
  on `visibilitychange` visible (iOS rarely restarts the PWA). Handle `unrecoverable` → force reload.
- **iOS gotchas**: no `beforeinstallprompt` → `ios-install.service.ts` detects iOS Safari & not
  `navigator.standalone`/`(display-mode: standalone)` → show `pp-install-hint` (dismiss stored).
  Storage: Safari may evict script-writable storage after ~7 days of no use for non-installed sites;
  installed home-screen apps are exempt-ish but call `navigator.storage.persist()` and push the user to
  **Export backup** (Settings) regularly — show "último respaldo hace N días". Home-screen app has
  separate storage from Safari tab (data added in Safari does NOT appear in installed app). No
  background sync on iOS. Status bar `black-translucent` means content goes under notch → safe-area padding mandatory.
  Splash screens require `apple-touch-startup-image` per resolution. Push notifications out of scope.

---

## 10. Testing strategy

Runner: Vitest through `ng test` (`@angular/build:unit-test`, jsdom). Zoneless: TestBed is zoneless
when `zone.js` is absent; use `await fixture.whenStable()` / `TestBed.tick()`; never `fakeAsync`.
`fake-indexeddb` (dev dep) for IDB adapter tests.

| Layer | What | How |
|---|---|---|
| domain | VO factories, rules 1–6, every analytics function (grouping, period ranges, trend, week boundaries across months/years, DST, CLP/USD minor units) | Plain Vitest, no TestBed, builders in `src/testing`. Highest coverage (≥95%). |
| application | Use cases + stores (optimistic add, rollback on repo failure, undo delete, filters, analytics computeds react to new expense) | TestBed with `provideExpensesInfrastructure('memory')`, `CLOCK` fake. |
| infrastructure | IDB repo contract: one shared `describeExpenseRepositoryContract(factory)` suite run against memory + IDB (+ HTTP with `HttpTestingController` later) | `fake-indexeddb/auto`. Guarantees swappability. |
| presentation (ui) | Atoms/molecules/organisms: inputs render, outputs emit, `model` two-way, a11y attributes | `TestBed.createComponent` + `fixture.componentRef.setInput()`. |
| presentation (pages) | Container wiring: quick-add saves and shows toast; history groups; insights period switch | Memory repo, RouterTestingHarness. |
| e2e (WU-14) | add → history → insights flow; offline reload; WebKit mobile viewport (iPhone 15) | Playwright. Real-device manual checklist for glass/safe-area. |

---

## 11. Implementation plan (ordered work units, each ≤ ~400 changed lines, commit per WU)

Every WU: `pnpm ng test --watch=false` and `pnpm ng build` green; conventional commit.

1. **WU-01 Scaffold** — `pnpm dlx @angular/cli@22 new pica-pica --package-manager=pnpm --style=css --routing --ssr=false --zoneless` in place; Node 24; remove `zone.js` if present; `provideZonelessChangeDetection()`; `provideBrowserGlobalErrorListeners()`; `LOCALE_ID 'es-CL'` + `registerLocaleData`; prettier; strict TS. AC: app boots, no `zone.js` in `pnpm why zone.js`, `ng test` runs Vitest.
2. **WU-02 Tailwind v4 + tokens** — `pnpm add tailwindcss @tailwindcss/postcss postcss`; `.postcssrc.json`; `styles.css` per §8; theme pre-paint script. AC: `glass` utility renders with `-webkit-backdrop-filter` in built CSS; dark via `data-theme`.
3. **WU-03 Shared domain + atoms A** — `result.ts`, `domain-error.ts`, `brand.ts`; atoms `glass-surface`, `icon` (sprite), `button`, `icon-button`, `divider`, `skeleton` + fixed background layer. AC: atom specs green.
4. **WU-04 Atoms B** — `amount-text`, `chip`, `text-field`, `amount-input`, `badge`, `toggle`. AC: `amount-input` parses `"1.500"`→1500 CLP, `"2,50"`→250 USD under es-CL; specs.
5. **WU-05 Expense domain** — VOs, entities, factories, errors, seeds. AC: rules 1–6 tested.
6. **WU-06 Analytics domain** — `expense-analytics.ts` full. AC: tests for each grouping, ISO weeks, trend, projectedMonth, topAnt.
7. **WU-07 Ports + memory adapter + contract suite** — ports, tokens, `InMemory*` repos, `describe…Contract`, `provideExpensesInfrastructure`. AC: contract passes for memory.
8. **WU-08 IndexedDB adapter** — `idb-database.ts`, IDB repos, mappers, `storage-persist.ts`, seeding use case; `fake-indexeddb`. AC: contract passes for IDB; data survives reload (manual).
9. **WU-09 Stores** — `ExpensesStore`, `CatalogStore`, `SettingsStore` (+ settings domain/IDB repo), `AnalyticsStore`, use cases. AC: optimistic/rollback/undo/analytics-reactivity tests.
10. **WU-10 Shell + navigation + molecules** — `app-header`, `tab-bar`, `toast` host, routes (§6) with placeholder pages, molecules `category-picker`, `method-picker`, `date-time-field`, `place-field`, `segmented-control`, `stat-card`, `empty-state`. AC: tab navigation works, lazy chunks in build output, safe-area on iPhone simulator/device.
11. **WU-11 Quick-add** — `expense-form` organism (Signal Forms), `QuickAddPage`, recent suggestions, undo toast. AC: add expense in ≤ 3 taps + amount; persisted; today total updates.
12. **WU-12 History + edit** — `search-bar`, `expense-row`, `day-group`, `expense-list`, `bottom-sheet`, `HistoryPage`, `ExpenseEditPage`. AC: filter/search, edit, soft delete + undo.
13. **WU-13 Insights** — `bar-chart`, `donut-chart`, `top-ant-list`, `InsightsPage`. AC: period switch + prev/next anchor recompute; empty state.
14. **WU-14 Settings + export/import** — settings page, catalog management (archive rule 3), JSON export/import (schemaVersion, validate via domain factories), CSV export, last-backup reminder. AC: export→wipe→import round-trip equals.
15. **WU-15 PWA** — `ng add @angular/pwa`, manifest/meta per §9, icons + splash (`pnpm dlx pwa-asset-generator`), `sw-update.service`, `ios-install.service`, `install-hint`. AC: Lighthouse installable; offline reload works; iOS home-screen launch standalone with correct status bar.
16. **WU-16 E2E + polish** — Playwright WebKit flows, a11y pass (labels, focus, contrast), perf (≤ 6 glass layers, initial JS budget 250 kB in `angular.json`). AC: e2e green, budgets pass.

---

## 12. Open questions / non-goals

Open (defaults chosen, confirm later):
- Currency/locale: default **CLP / es-CL** (assumption); multi-currency per expense deferred.
- Ant threshold default 5 000 CLP — user-editable.
- Week start Monday (ISO) — assumption.

Non-goals (MVP): backend, auth, sync, multi-device, budgets/alerts, receipts/photos, geolocation/maps,
push notifications, recurring expenses, bank import, SSR, i18n beyond Spanish UI strings, NgRx.
Growth path: add `HttpExpenseRepository` + `SyncingExpenseRepository` decorator behind the same
ports, `dataGroups` in ngsw, auth interceptor — no presentation changes.
