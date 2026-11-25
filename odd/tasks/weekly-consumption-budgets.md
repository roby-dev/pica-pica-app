# Weekly consumption budgets
Track weekly consumption after savings, without combining currencies.
Delivery strategy: ask-on-risk. Work-unit forecast: about two reviewable slices; confirm authored size after implementation.

## Specs

S1. User: “que sea para todos los gastos, poruen oamalmente yo ahorro una cantiad y para mi consumo queiro tracker cno esta app”
S2. User-selected option: “Un presupuesto por moneda”. Accepted scope: “**En Ajustes**, fijás un tope semanal por moneda. Por ejemplo, **S/ 150** y **US$ 40**.”
S3. Accepted scope: “**En Resumen**, ves cuánto gastaste de lunes a domingo y cuánto te queda —o por cuánto te pasaste— en cada moneda.”
S4. Accepted scope: “**Todos tus gastos registrados cuentan**, sin aplicar el umbral de gastos hormiga. No se mezclan monedas ni hace falta registrar tus ingresos o ahorros.”

## Tasks

- T1 · S2, S4 · Local settings, persistence compatibility and Settings controls · route: bounded worker (context backstop); Risk: item 3 (existing v1 restore/export and startup settings use the changed contract) · status: verified · commit: this work unit
- T2 · S1, S3, S4 · Weekly budget status in Summary and focused user-facing checks · route: depends on T1 · status: pending · commit: —

## Log

L1. “vamos!”
L2. “me agrada el presupuesto semanal.”
L3. “que sea para todos los gastos, poruen oamalmente yo ahorro una cantiad y para mi consumo queiro tracker cno esta app”
L4. Selected “Un presupuesto por moneda” and accepted the scope quoted in S2–S4.
L5. Exploration found the existing Monday–Sunday helper and separate currency totals. Use additive settings data and keep previous local settings and v1 backups readable.
L6. T1 writer observed 19 RED failures before implementation and one separate startup RED. T1 focused suite passed 53/53, lint passed; parent repeated 53/53 and verified architecture boundaries and whitespace. No commit.
L7. Assessment applied Task Size item 3 and required independent verification. Independent readback found no reproduced product blocker, but runtime verification did not start: the isolated pnpm launcher setup raised `SyntaxError: Invalid or unexpected token`. Do not count it as passed or retry the unavailable verifier. Export before settings finish loading remains an unverified pre-existing timing risk. T2 has not started.
L8. User supplied a separate isolated verification of the same T1 diff: focused suite 53/53 in seven files, dedicated IndexedDB + backup cold-reload probe 1/1, lint, boundary verification and production build all exit 0. The probe confirmed old v1 preservation, explicit empty-list clearing, and separate PEN/USD storage and restore. No blockers; the early-export timing risk predates the change.
