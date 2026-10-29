import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractMarkdownLinks,
  extractPolicyIds,
  extractReferencedPolicyIds,
  validateFeatureCard,
  validateFeatureCatalog,
  validateFeatureFolder,
  validateFeatureNavigation,
  validateAdrIndex,
  validateDesignFolder,
  designImageMaxBytes,
} from './checkDocs.mjs';

test('extractPolicyIds reads only registry table identifiers', () => {
  const markdown = `
| Policy ID | Rule | Source |
| --- | --- | --- |
| AUTH-001 | Active membership | Architecture |
Text mentioning QA-002 is not a registry row.
| QA-002 | Immutable result | Workflow |
`;

  assert.deepEqual(extractPolicyIds(markdown), ['AUTH-001', 'QA-002']);
});

test('extractReferencedPolicyIds returns unique references', () => {
  assert.deepEqual(
    [...extractReferencedPolicyIds('AUTH-001 applies with AUTH-001 and QA-002.')],
    ['AUTH-001', 'QA-002'],
  );
});

test('extractMarkdownLinks ignores examples inside fenced code', () => {
  const markdown = `
[Architecture](docs/1_ARCHITECTURE.md)

\`\`\`markdown
[Placeholder](missing.md)
\`\`\`
`;

  assert.deepEqual(extractMarkdownLinks(markdown), ['docs/1_ARCHITECTURE.md']);
});

test('validateFeatureCard rejects unknown policy identifiers', () => {
  const card = `
**Status:** Draft
**Owner:** Product
**Last reviewed:** 2026-09-02
**Applicable Policy IDs:** UNKNOWN-999

## 1. Tujuan dan Pengguna
## 2. Requirement dan Acceptance Criteria
## 3. Alur Lintas Peran
## 4. Data dan Relasi
## 5. API dan Shared Contract
## 6. Authorization
## 7. UI dan Interaction States
## 8. Pengujian dan Evidence
## 9. Release dan Readiness
## 10. Traceability
`;

  assert.deepEqual(validateFeatureCard(card, new Set(['AUTH-001']), 'unknown.md'), [
    'unknown.md references unknown Policy ID: UNKNOWN-999',
  ]);
});

test('validateFeatureCard rejects unresolved placeholders in Active cards', () => {
  const template = `
**Status:** Active
**Owner:** TBD
**Last reviewed:** YYYY-MM-DD
**Applicable Policy IDs:** AUTH-001
${[
  '## 1. Tujuan dan Pengguna',
  '## 2. Requirement dan Acceptance Criteria',
  '## 3. Alur Lintas Peran',
  '## 4. Data dan Relasi',
  '## 5. API dan Shared Contract',
  '## 6. Authorization',
  '## 7. UI dan Interaction States',
  '## 8. Pengujian dan Evidence',
  '## 9. Release dan Readiness',
  '## 10. Traceability',
].join('\n')}
`;

  assert.match(
    validateFeatureCard(template, new Set(['AUTH-001']), 'active.md').join('\n'),
    /Active but still contains an unresolved placeholder/,
  );
});

test('validateFeatureFolder requires the stage, role, and shared-contract documents', () => {
  assert.deepEqual(validateFeatureFolder(['README.md', 'product.md'], 'docs/features/EXAMPLE'), [
    'docs/features/EXAMPLE is missing required file: problem.md',
    'docs/features/EXAMPLE is missing required file: solution.md',
    'docs/features/EXAMPLE is missing required file: breakdown.md',
    'docs/features/EXAMPLE is missing required file: contracts.md',
    'docs/features/EXAMPLE is missing required file: authorization.md',
    'docs/features/EXAMPLE is missing required file: testing.md',
    'docs/features/EXAMPLE is missing required file: release.md',
    'docs/features/EXAMPLE is missing required file: roles/owner-admin.md',
    'docs/features/EXAMPLE is missing required file: roles/po.md',
    'docs/features/EXAMPLE is missing required file: roles/developer.md',
    'docs/features/EXAMPLE is missing required file: roles/qa.md',
  ]);
});

test('validateFeatureNavigation requires the expected catalogue sections', () => {
  assert.deepEqual(
    validateFeatureNavigation(
      '## Cara memakai katalog',
      ['## Cara memakai katalog', '## QA'],
      'catalog.md',
    ),
    ['catalog.md is missing required navigation heading: ## QA'],
  );
});

test('validateFeatureCatalog requires every legacy Feature exactly once', () => {
  assert.deepEqual(
    validateFeatureCatalog('[A](A.md)\n[A again](A.md)', ['A.md', 'B.md'], 'catalog.md'),
    [
      'catalog.md repeats legacy Feature link: A.md',
      'catalog.md is missing legacy Feature link: B.md',
    ],
  );
});

test('validateAdrIndex rejects duplicate numbers and enforces one index link per ADR', () => {
  assert.deepEqual(
    validateAdrIndex(
      ['ADR-016-ONE.md', 'ADR-016-TWO.md', 'ADR-017-THREE.md', 'README.md'],
      '[One](ADR-016-ONE.md)\n[One again](ADR-016-ONE.md)\n[Three](ADR-017-THREE.md)',
    ),
    [
      'Duplicate ADR number in docs/adr: ADR-016.',
      'docs/adr/README.md repeats ADR link: ADR-016-ONE.md',
      'docs/adr/README.md is missing ADR link: ADR-016-TWO.md',
    ],
  );
});

test('feature folder template satisfies the required stage structure', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const root = new URL('../docs/features/_template/', import.meta.url).pathname;
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [relative(root, full)];
    });
  assert.deepEqual(validateFeatureFolder(walk(root), 'docs/features/_template'), []);
});

test('validateDesignFolder accepts README, source, and small WebP exports', () => {
  assert.deepEqual(
    validateDesignFolder(
      [
        { name: 'README.md', size: 2000, isDirectory: false },
        { name: 'source', size: 0, isDirectory: true },
        { name: '01-screen.webp', size: designImageMaxBytes, isDirectory: false },
      ],
      3,
      'docs/plans/x/design',
    ),
    [],
  );
});

test('validateDesignFolder rejects missing README/source, non-WebP, and oversized images', () => {
  assert.deepEqual(
    validateDesignFolder(
      [
        { name: '01-screen.png', size: 1000, isDirectory: false },
        { name: '02-screen.webp', size: designImageMaxBytes + 1, isDirectory: false },
        { name: 'notes.txt', size: 10, isDirectory: false },
      ],
      0,
      'docs/plans/x/design',
    ),
    [
      'docs/plans/x/design is missing README.md (DOC-007).',
      'docs/plans/x/design is missing a non-empty source/ folder (DOC-007).',
      'docs/plans/x/design/01-screen.png must be exported as WebP (DOC-007).',
      'docs/plans/x/design/02-screen.webp is 301 KB; the limit is 300 KB (DOC-007).',
    ],
  );
});
