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
- [ ] T14 WU-14 history + edit
- [ ] T15 WU-15 insights domain
- [ ] T16 WU-16 insights store + page
- [ ] T17 WU-17 settings UI + catalog
- [ ] T18 WU-18 backup
- [ ] T19 WU-19 PWA
- [ ] T20 WU-20 E2E + polish

## Log
- L1 (user, verbatim): "neceisto crear un sistema web, angular , ultima version, usando tailwind pnpm. full signals, sin zone,js, que pueda admimtr PWA para correrlo en mi celular (osae se qque sea mobile first) para aplicar gastos hormiga,s usa diseño usando glasmorfismo. (Porque lo usare en mi ios y tienequ e verse implecable)." / "armamos la arteqictura con opus sus web compoentes,. y luego implem,entaos con sonnet"
- L2 (user, 2026-10-30): "moneda local PEN , semana empiza en lunes. sin zone.js, umbral no entiendo, pero si edberia poder hgacer multi m,oneda (feature futuro)... mejor como screamming architecture"
- L3 (user): "Está bien como lo propone" (currency picker hidden behind "Cambiar moneda").
