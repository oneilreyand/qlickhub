import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractMarkdownLinks,
  extractPolicyIds,
  extractReferencedPolicyIds,
  validateAdrRecords,
  validateFeatureCard,
  validateFeatureCatalog,
  validateFeatureFolder,
  validateFeatureNavigation,
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

test('validateFeatureFolder requires the role and shared-contract documents', () => {
  assert.deepEqual(validateFeatureFolder(['README.md', 'product.md'], 'docs/features/EXAMPLE'), [
    'docs/features/EXAMPLE is missing required file: contracts.md',
    'docs/features/EXAMPLE is missing required file: authorization.md',
    'docs/features/EXAMPLE is missing required file: testing.md',
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

test('validateAdrRecords rejects duplicate ADR numbers', () => {
  const files = ['ADR-016-ALPHA.md', 'ADR-016-BETA.md'];
  const index = '[ADR-016](ADR-016-ALPHA.md)\n[ADR-016](ADR-016-BETA.md)';

  assert.deepEqual(validateAdrRecords(files, index, 'index.md'), [
    'ADR number 016 is used by more than one file: ADR-016-ALPHA.md, ADR-016-BETA.md',
  ]);
});

test('validateAdrRecords requires every ADR exactly once in the index', () => {
  const files = ['ADR-001-ALPHA.md', 'ADR-002-BETA.md'];
  const index = '[ADR-001](ADR-001-ALPHA.md)\n[again](ADR-001-ALPHA.md)';

  assert.deepEqual(validateAdrRecords(files, index, 'index.md'), [
    'index.md repeats ADR link: ADR-001-ALPHA.md',
    'index.md is missing ADR link: ADR-002-BETA.md',
  ]);
});

test('validateAdrRecords rejects files outside the ADR naming pattern', () => {
  assert.deepEqual(validateAdrRecords(['ADR-7-short.md'], '', 'index.md'), [
    'docs/adr/ADR-7-short.md does not follow the ADR-NNN-TITLE.md naming pattern.',
  ]);
});

test('validateAdrRecords accepts unique, fully indexed ADRs', () => {
  const files = ['ADR-001-ALPHA.md', 'ADR-002-BETA.md'];
  const index = '| [ADR-001](ADR-001-ALPHA.md) | A |\n| [ADR-002](ADR-002-BETA.md#context) | B |';

  assert.deepEqual(validateAdrRecords(files, index, 'index.md'), []);
});
