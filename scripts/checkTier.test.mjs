import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { evaluateTier, globToRegExp, matchTier2, parsePatterns } from './checkTier.mjs';

const patterns = parsePatterns(
  fs.readFileSync(new URL('../quality/tier2-paths.txt', import.meta.url), 'utf8'),
);

test('parsePatterns ignores comments and blank lines', () => {
  assert.deepEqual(parsePatterns('# note\n\nAGENTS.md\n  docs/adr/**  \n'), [
    'AGENTS.md',
    'docs/adr/**',
  ]);
});

test('globToRegExp handles single and double stars', () => {
  assert.ok(globToRegExp('docs/adr/**').test('docs/adr/ADR-028-X.md'));
  assert.ok(globToRegExp('apps/*/package.json').test('apps/web/package.json'));
  assert.ok(!globToRegExp('apps/*/package.json').test('apps/web/src/package.json'));
  assert.ok(globToRegExp('scripts/check*.mjs').test('scripts/checkTier.mjs'));
  assert.ok(globToRegExp('.env*.example').test('.env.production.example'));
  assert.ok(!globToRegExp('vercel.json').test('xvercel.json'));
});

test('every Tier 2 area is matched by the repository pattern list', () => {
  const tier2Files = [
    'AGENTS.md',
    'docs/POLICY_REGISTRY.md',
    'docs/4_AGENT_DEV_GUIDELINES.md',
    'docs/adr/ADR-028-TIERED-AUTO-MERGE.md',
    '.github/workflows/ci.yml',
    'scripts/checkTier.mjs',
    'quality/tier2-paths.txt',
    'apps/api/src/db/migrations/20261003000000-add-column.cjs',
    'database/migrations/001.sql',
    'apps/api/src/policies/taskPolicy.ts',
    'apps/api/src/modules/auth/auth.routes.ts',
    'apps/api/src/http/middleware/authorize.ts',
    '.env.example',
    'apps/web/.env.production.example',
    'vercel.json',
    'api/index.mjs',
    'docs/DEPLOYMENT_AND_ENVIRONMENTS.md',
    'package-lock.json',
    'apps/api/package.json',
    'packages/contracts/package.json',
  ];
  const matched = matchTier2(tier2Files, patterns).map(({ file }) => file);
  assert.deepEqual(matched, tier2Files);
});

test('routine Tier 1 files are not matched', () => {
  const tier1Files = [
    'apps/web/src/components/ui/atoms/Button.tsx',
    'apps/api/src/modules/tasks/taskService.ts',
    'apps/api/src/modules/tasks/__tests__/taskApiIntegration.test.ts',
    'packages/contracts/src/task.ts',
    'docs/features/FEATURE_CATALOG.md',
    'docs/plans/SOME_PLAN.md',
    'docs/reports/SOME_REPORT_2026-10-03.md',
    'docs/3_UI_ATOMIC_DESIGN_SYSTEM.md',
    'TODO.md',
    'README.md',
    'apps/web/README.md',
  ];
  assert.deepEqual(matchTier2(tier1Files, patterns), []);
});

test('evaluateTier passes Tier 1 and requires approval for Tier 2', () => {
  assert.deepEqual(
    evaluateTier({ changedFiles: ['README.md'], patterns, approved: false }).pass,
    true,
  );
  const blocked = evaluateTier({
    changedFiles: ['README.md', 'AGENTS.md'],
    patterns,
    approved: false,
  });
  assert.equal(blocked.tier, 2);
  assert.equal(blocked.pass, false);
  assert.deepEqual(blocked.matches, [{ file: 'AGENTS.md', pattern: 'AGENTS.md' }]);
  assert.equal(evaluateTier({ changedFiles: ['AGENTS.md'], patterns, approved: true }).pass, true);
});
