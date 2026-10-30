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
- [ ] T3 WU-03 Tailwind v4 + tokens
- [ ] T4 WU-04 Shared kernel
- [ ] T5 WU-05 shared/ui atoms A
- [ ] T6 WU-06 shared/ui atoms B
- [ ] T7 WU-07 shared/persistence
- [ ] T8 WU-08 settings core
- [ ] T9 WU-09 expenses domain
- [ ] T10 WU-10 expenses ports + adapters
- [ ] T11 WU-11 expenses stores + use cases
- [ ] T12 WU-12 shell + molecules/organisms
- [ ] T13 WU-13 quick-add
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
