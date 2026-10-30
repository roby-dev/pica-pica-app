// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

const sameFeature = { captured: { feature: '{{ from.element.captured.feature }}' } };
const otherFeature = { captured: { feature: '!{{ from.element.captured.feature }}' } };

const own = (...types) => ({ element: { types: { anyOf: types }, ...sameFeature } });
const shared = (...types) => ({ element: { types: { anyOf: types } } });
// Another feature may only be reached through its public API (index.ts).
const otherEntry = {
  element: { type: 'feature-root', ...otherFeature },
  file: { categories: 'entry' },
};
const anyEntry = { element: { type: 'feature-root' }, file: { categories: 'entry' } };

export default tseslint.config(
  { ignores: ['dist/', '.angular/', 'node_modules/', 'coverage/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'pp', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'pp', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
  {
    // Architecture boundaries (see docs/architecture.md section 3c). Specs are exempt.
    files: ['src/app/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'kernel', pattern: 'src/app/shared/kernel' },
        { type: 'shared-persistence', pattern: 'src/app/shared/persistence' },
        { type: 'shared-ui', pattern: 'src/app/shared/ui' },
        { type: 'shared-testing', pattern: 'src/app/shared/testing' },
        { type: 'shared-di', pattern: 'src/app/shared/di' },
        { type: 'shell', pattern: 'src/app/shell' },
        { type: 'domain', pattern: 'src/app/*/domain', capture: ['feature'] },
        {
          type: 'application',
          pattern: 'src/app/*/application',
          capture: ['feature'],
        },
        {
          type: 'infrastructure',
          pattern: 'src/app/*/infrastructure',
          capture: ['feature'],
        },
        {
          type: 'components',
          pattern: 'src/app/*/ui/components',
          capture: ['feature'],
        },
        { type: 'pages', pattern: 'src/app/*/ui/pages', capture: ['feature'] },
        { type: 'feature-root', pattern: 'src/app/*', capture: ['feature'] },
      ],
      'boundaries/files': [
        { pattern: 'src/app/*/index.ts', category: 'entry' },
        { pattern: 'src/app/*/*.providers.ts', category: 'providers' },
        { pattern: 'src/app/*/*.routes.ts', category: 'routes' },
        { pattern: 'src/app/*.ts', category: 'app-root' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'kernel' } }, allow: { to: shared('kernel') } },
            {
              from: { element: { type: 'shared-di' } },
              allow: { to: shared('kernel', 'shared-persistence', 'shared-di') },
            },
            {
              from: { element: { type: 'shared-testing' } },
              allow: { to: shared('kernel', 'shared-testing') },
            },
            {
              from: { element: { type: 'shared-ui' } },
              allow: { to: shared('kernel', 'shared-ui') },
            },
            {
              from: { element: { type: 'shared-persistence' } },
              allow: { to: shared('kernel', 'shared-persistence') },
            },
            {
              from: { element: { type: 'domain' } },
              allow: { to: [shared('kernel'), own('domain')] },
            },
            {
              from: { element: { type: 'application' } },
              allow: { to: [shared('kernel', 'shared-di'), own('domain', 'application'), otherEntry] },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: [
                  shared('kernel', 'shared-persistence', 'shared-di'),
                  own('domain', 'application', 'infrastructure'),
                  otherEntry,
                ],
              },
            },
            {
              from: { element: { type: 'components' } },
              allow: { to: [shared('kernel', 'shared-ui'), own('domain', 'components')] },
            },
            {
              from: { element: { type: 'pages' } },
              allow: {
                to: [
                  shared('kernel', 'shared-ui'),
                  own('domain', 'application', 'components', 'pages'),
                ],
              },
            },
            {
              from: { element: { type: 'feature-root' }, file: { categories: 'providers' } },
              allow: {
                to: [
                  shared('kernel', 'shared-persistence', 'shared-di'),
                  own('domain', 'application', 'infrastructure'),
                  otherEntry,
                ],
              },
            },
            {
              from: { element: { type: 'feature-root' }, file: { categories: 'routes' } },
              allow: { to: own('pages') },
            },
            {
              from: { element: { type: 'feature-root' }, file: { categories: 'entry' } },
              allow: { to: [shared('kernel'), own('domain', 'application', 'feature-root')] },
            },
            {
              from: { element: { type: 'shell' } },
              allow: {
                to: [shared('kernel', 'shared-ui', 'shared-persistence', 'shared-di', 'shell'), anyEntry],
              },
            },
            {
              from: { file: { categories: 'app-root' } },
              allow: {
                to: [
                  shared('kernel', 'shared-ui', 'shared-persistence', 'shared-di', 'shell'),
                  anyEntry,
                  { file: { categories: 'app-root' } },
                ],
              },
            },
          ],
        },
      ],
    },
  },
  {
    // Domain and kernel stay framework-free.
    files: ['src/app/shared/kernel/**/*.ts', 'src/app/*/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@angular/*', 'idb'], message: 'Domain/kernel must be framework-free.' }] },
      ],
    },
  },
);
