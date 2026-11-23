# pica-pica MVP
Objective: mobile-first iOS-installable PWA for ant-expense tracking (Angular 22 zoneless, signals, Tailwind 4, pnpm, local IndexedDB).
Branch: main (user-directed; remote roby-dev/pica-pica-app). Delivery: ask-on-risk, one commit per work unit. Test runner: Vitest (`pnpm ng test --watch=false`).
Spec source of truth: `docs/architecture.md` (read it fully; section 11 lists work units WU-01..WU-20 with acceptance criteria).

## Specs
- S1: "PEN (S/)", locale es-PE, week starts Monday, no zone.js.
- S2: Ant threshold is a user-editable setting, default S/ 20.00.
- S3: Multi-currency ready (per-expense currency, per-currency totals, no conversion); UI hides currency picker behind "Cambiar moneda".
- S4: Screaming architecture exactly as `docs/architecture.md` section 3 (expenses/ insights/ settings/ backup/ shell/ shared/).
- S5: Glassmorphism must look impeccable on iOS (section 8); PWA installable on iOS (section 9).
- S6: Code, comments, tests, docs in English; UI copy in Spanish (Peru).

## Tasks
- [x] T1 WU-01 Scaffold (S1,S4) — inline — test 2/2, build OK, no zone.js
- [x] T2 WU-02 Aliases + boundaries lint — inline — lint clean, lint:verify 7/7, test+build OK
- [x] T3 WU-03 Tailwind v4 + tokens — inline — built CSS has -webkit-backdrop-filter, data-theme dark, .app-bg
- [x] T4 WU-04 Shared kernel — inline — 14 kernel specs, lint clean, build OK
- [x] T5 WU-05 shared/ui atoms A — inline — 10 specs, lint clean, build OK, touch targets >=44px
- [x] T6 WU-06 shared/ui atoms B — inline — 57 tests total, lint clean, build OK, parse cases incl. 20,50 and 1,250.50
- [x] T7 WU-07 shared/persistence — inline — 64 tests, lint clean, build OK; added shared/di (tokens + provideShared)
- [x] T8 WU-08 settings core — inline — 84 tests, lint clean, build OK; defaults on empty DB, currency change without threshold rejected
- [x] T9 WU-09 expenses domain — inline — 113 tests, lint clean, build OK; rules 1,2,6,7 covered
- [x] T10 WU-10 expenses ports + adapters — inline — 143 tests, contract suite green on memory+IndexedDB, lint clean, build OK; added Category/PaymentMethod.position
- [x] T11 WU-11 expenses stores + use cases — inline — 162 tests: optimistic, rollback, undo, default currency from settings; lint clean, build OK
- [x] T12 WU-12 shell + molecules/organisms — inline, 2 commits — 190 tests, lint clean, 5 lazy page chunks in build, tabs navigate
- [x] T13 WU-13 quick-add
- [x] T14 WU-14 history + edit
- [x] T15 WU-15 insights domain
- [x] T16 WU-16 insights store + page
- [x] T17 WU-17 settings UI + catalog (default currency intentionally left out)
- [x] T18 WU-18 backup (JSON export + restore + Smart Spend import; CSV and reminder left out)
- [ ] T19 WU-19 PWA
- [ ] T20 WU-20 E2E + polish

## Log
- L1 (user, verbatim): "neceisto crear un sistema web, angular , ultima version, usando tailwind pnpm. full signals, sin zone,js, que pueda admimtr PWA para correrlo en mi celular (osae se qque sea mobile first) para aplicar gastos hormiga,s usa diseño usando glasmorfismo. (Porque lo usare en mi ios y tienequ e verse implecable)." / "armamos la arteqictura con opus sus web compoentes,. y luego implem,entaos con sonnet"
- L2 (user, 2026-10-30): "moneda local PEN , semana empiza en lunes. sin zone.js, umbral no entiendo, pero si edberia poder hgacer multi m,oneda (feature futuro)... mejor como screamming architecture"
- L3 (user): "Está bien como lo propone" (currency picker hidden behind "Cambiar moneda").
- L4 (2026-11-23, T20 polish, UX + intelligence), all inline, each committed and pushed to main:
  - 01a99b2 quick-add: one-tap "Recientes" presets (autofill amount/currency/category/method/place), +1/+2/+5/+10 steps, keypad closes after tiles/chips.
  - 5ae71f4 presets ranked by habit: recency (14-day half-life) x closeness to current hour x same weekday/weekend type (`expenses/domain/preset-ranking.ts`).
  - 4d53c3d LiveClock (`shared/di/live-clock.ts`): derived "now" re-read on visibilitychange, because an iOS PWA resumes without reloading.
  - 2c40835 custom payment methods ("Agregar método", name + type) so each card is its own method. User (verbatim): "no creoq ue esae neceairo lo de ultimos 4 digitos. pero si me agreda tu idea".
  - 8c949d5 insights: yearly cost per ant habit = total / elapsed days x 365, hidden under 7 elapsed days.
  - f8800e5 CI fix: runner is UTC; time-dependent tests must build dates in local time. Check with `TZ=UTC pnpm ng test --watch=false`.
  - a6d6a01 presets grouped ignoring case/spaces, matching the insights habit counter (accents still distinguish).
  - Evidence: 367 tests green in UTC and America/Lima, lint clean, build OK, Pages deploy green from f8800e5.
- L5 (2026-11-23) Next, pending a user decision: import Yape "ReporteTransacciones" .xlsx (sheet "Movimientos", header row 5: Tipo de Transacción, Origen, Destino, Monto [string], Mensaje [mostly empty], Fecha de operación [dd/MM/yyyy HH:mm:ss]; file has broken accents such as "TE PAG�"). Proposal: import only PAGASTE, skip "SIP - " self-transfers, method Yape/Plin, Destino as place, deterministic id from date+amount+destino for dedupe, read xlsx without a dependency (DecompressionStream). Open question to the user: classify by learning from the destination (recommended) or send everything to "Otros".
- L6 Remaining backlog ideas: autocomplete on typing, "Repetir" from history, PWA shortcuts (T19), spend deviation alerts, price changes per item/place, hour x weekday heatmap.
