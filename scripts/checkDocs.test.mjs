import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractMarkdownLinks,
  extractPolicyIds,
  extractReferencedPolicyIds,
  validateFeatureCard,
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
