// Proves the architecture lint rules actually report forbidden imports.
import { ESLint } from 'eslint';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const eslint = new ESLint({ cwd: process.cwd() });
const at = (p) => path.resolve('src/app', p);

const cases = [
  { name: 'domain -> other feature domain', file: 'expenses/domain/a.ts', code: "import '../../insights/domain/index';\n", expect: 'boundaries/dependencies' },
  { name: 'domain -> other feature via barrel', file: 'insights/domain/a.ts', code: "import '@pp/expenses';\n", expect: 'boundaries/dependencies' },
  { name: 'domain -> Angular', file: 'expenses/domain/a.ts', code: "import '@angular/core';\n", expect: 'no-restricted-imports' },
  { name: 'application -> own infrastructure', file: 'expenses/application/a.ts', code: "import '../infrastructure/memory/x';\n", expect: 'boundaries/dependencies' },
  { name: 'ui component -> application', file: 'expenses/ui/components/a/a.ts', code: "import '../../../application/expenses.store';\n", expect: 'boundaries/dependencies' },
  { name: 'application -> other feature barrel is allowed', file: 'insights/application/a.ts', code: "import '@pp/expenses';\n", expect: null },
  { name: 'domain -> kernel is allowed', file: 'expenses/domain/a.ts', code: "import '@pp/shared/kernel';\n", expect: null },
];

// Import targets must exist for the resolver to classify them; create and clean up fixtures.
const fixtures = [
  'insights/domain/index.ts',
  'expenses/infrastructure/memory/x.ts',
  'expenses/application/expenses.store.ts',
].map(at);
const created = fixtures.filter((f) => !fs.existsSync(f));
for (const f of created) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'export {};\n');
}

let failed = 0;
for (const c of cases) {
  const [result] = await eslint.lintText(c.code, { filePath: at(c.file) });
  const rules = result.messages.map((m) => m.ruleId);
  try {
    if (c.expect) assert.ok(rules.includes(c.expect), `expected ${c.expect}, got ${rules.join(',') || 'none'}`);
    else assert.ok(!rules.some((r) => r?.startsWith('boundaries/')), `unexpected ${rules.join(',')}`);
    console.log(`ok   ${c.name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${c.name}: ${e.message}`);
  }
}
for (const f of created) fs.rmSync(f);
for (const d of ['insights/domain', 'expenses/infrastructure/memory', 'expenses/infrastructure', 'expenses/application']) {
  try { fs.rmdirSync(at(d)); } catch { /* not empty or absent */ }
}
process.exit(failed ? 1 : 0);
