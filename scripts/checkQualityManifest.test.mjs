import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import {
  assessManifests,
  approvalPlanPath,
  parseGitHubApprovalComment,
  resolveGitHubApprovals,
  validateGitHubApprovalRecord,
  validatePlanDigest,
  mergeChangedFiles,
  inferQualityScopes,
  runQualityCheck,
  validateManifest,
} from './checkQualityManifest.mjs';

const validManifest = {
  version: 1,
  id: 'QUALITY-123',
  changedFiles: ['apps/web/src/pages/ExamplePage.tsx'],
  scopes: ['ui', 'performance'],
  evidence: {
    ui: { status: 'collected', artifacts: ['docs/reports/example.md'] },
    performance: { status: 'planned', artifacts: [] },
  },
};

const validApprovalManifest = {
  version: 2,
  id: 'AGENT-APPROVAL-123',
  changedFiles: ['apps/web/src/pages/ExamplePage.tsx'],
  scopes: ['ui', 'performance'],
  evidence: {
    ui: { status: 'collected', artifacts: ['docs/reports/example.md'] },
    performance: { status: 'collected', artifacts: ['docs/reports/performance.md'] },
  },
  approval: {
    authority: 'github',
    recordUrl: 'https://github.com/example/qlickhub/issues/123#issuecomment-456',
    recordId: '456',
    planDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    baselineCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    approvedBy: 'product-owner',
    approvedAt: '2026-09-29T01:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    allowedFiles: ['apps/web/src/pages/ExamplePage.tsx'],
    roleScope: { targetRoles: ['po'], preservedRoles: ['dev', 'qa'] },
    allowedStateChanges: ['edit approved UI file'],
  },
};

test('infers UI and performance for web source changes', () => {
  assert.deepEqual(inferQualityScopes(['apps/web/src/pages/ExamplePage.tsx']), [
    'performance',
    'ui',
  ]);
});

test('infers data access and performance for migration and repository changes', () => {
  assert.deepEqual(
    inferQualityScopes([
      'apps/api/src/db/migrations/001.cjs',
      'apps/api/src/db/repositories/taskRepository.ts',
    ]),
    ['dataAccess', 'performance'],
  );
});

test('infers AI scope for AI module changes', () => {
  assert.deepEqual(inferQualityScopes(['apps/api/src/modules/ai/geminiClient.ts']), ['ai']);
});

test('retains untracked files when composing a local changed-file set', () => {
  assert.deepEqual(
    mergeChangedFiles(
      ['apps/web/src/App.tsx'],
      ['quality/manifests/NEW-TASK.json', 'apps/web/src/App.tsx'],
    ),
    ['apps/web/src/App.tsx', 'quality/manifests/NEW-TASK.json'],
  );
});

test('rejects collected evidence without an artifact', () => {
  const invalid = structuredClone(validManifest);
  invalid.evidence.ui.artifacts = [];
  assert.deepEqual(validateManifest(invalid, 'quality/manifests/invalid.json'), [
    'quality/manifests/invalid.json marks ui collected without an artifact.',
  ]);
});

test('accepts a complete version 2 external approval claim', () => {
  assert.deepEqual(validateManifest(validApprovalManifest, 'quality/manifests/approval.json'), []);
});

test('rejects a version 2 manifest without external approval', () => {
  const invalid = structuredClone(validApprovalManifest);
  delete invalid.approval;
  assert.deepEqual(validateManifest(invalid, 'quality/manifests/approval.json'), [
    'quality/manifests/approval.json must declare approval for version 2.',
  ]);
});

test('rejects a version 2 manifest that exceeds its approved file scope', () => {
  const invalid = structuredClone(validApprovalManifest);
  invalid.changedFiles.push('apps/web/src/App.tsx');
  assert.deepEqual(validateManifest(invalid, 'quality/manifests/approval.json'), [
    'quality/manifests/approval.json declares changedFiles outside approval.allowedFiles.',
  ]);
});

test('rejects a version 2 manifest whose approval file scope is broader than its changed files', () => {
  const invalid = structuredClone(validApprovalManifest);
  invalid.approval.allowedFiles.push('apps/web/src/App.tsx');
  assert.deepEqual(validateManifest(invalid, 'quality/manifests/approval.json'), [
    'quality/manifests/approval.json approval.allowedFiles must exactly match changedFiles.',
  ]);
});

test('rejects an expired-before-approved approval claim and overlapping role scope', () => {
  const invalid = structuredClone(validApprovalManifest);
  invalid.approval.expiresAt = invalid.approval.approvedAt;
  invalid.approval.roleScope.preservedRoles.push('po');
  assert.deepEqual(validateManifest(invalid, 'quality/manifests/approval.json'), [
    'quality/manifests/approval.json approval.expiresAt must be later than approval.approvedAt.',
    'quality/manifests/approval.json approval.roleScope cannot target and preserve the same role.',
  ]);
});

test('parses and verifies a matching external GitHub approval record', () => {
  const payload = {
    taskId: validApprovalManifest.id,
    planDigest: validApprovalManifest.approval.planDigest,
    baselineCommit: validApprovalManifest.approval.baselineCommit,
    approvedAt: validApprovalManifest.approval.approvedAt,
    expiresAt: validApprovalManifest.approval.expiresAt,
    allowedFiles: validApprovalManifest.approval.allowedFiles,
    roleScope: validApprovalManifest.approval.roleScope,
    allowedStateChanges: validApprovalManifest.approval.allowedStateChanges,
  };
  const comment = {
    html_url: validApprovalManifest.approval.recordUrl,
    user: { login: validApprovalManifest.approval.approvedBy },
    author_association: 'OWNER',
    body: `Approved\n<!-- qlickhub-agent-approval:v1\n${JSON.stringify(payload)}\n-->`,
  };

  assert.deepEqual(parseGitHubApprovalComment(comment.body), { payload });
  assert.deepEqual(
    validateGitHubApprovalRecord(validApprovalManifest, comment, {
      baseCommit: validApprovalManifest.approval.baselineCommit,
      now: '2026-09-30T01:00:00.000Z',
    }),
    [],
  );
});

test('accepts equivalent approval payload arrays in a different order', () => {
  const manifest = structuredClone(validApprovalManifest);
  manifest.approval.allowedFiles = ['apps/web/src/pages/ExamplePage.tsx', 'package.json'];
  manifest.changedFiles = [...manifest.approval.allowedFiles];
  const payload = {
    taskId: manifest.id,
    planDigest: manifest.approval.planDigest,
    baselineCommit: manifest.approval.baselineCommit,
    approvedAt: manifest.approval.approvedAt,
    expiresAt: manifest.approval.expiresAt,
    allowedFiles: [...manifest.approval.allowedFiles].reverse(),
    roleScope: manifest.approval.roleScope,
    allowedStateChanges: manifest.approval.allowedStateChanges,
  };
  assert.deepEqual(
    validateGitHubApprovalRecord(
      manifest,
      {
        html_url: manifest.approval.recordUrl,
        user: { login: manifest.approval.approvedBy },
        author_association: 'OWNER',
        body: `<!-- qlickhub-agent-approval:v1\n${JSON.stringify(payload)}\n-->`,
      },
      { baseCommit: manifest.approval.baselineCommit, now: '2026-09-30T01:00:00.000Z' },
    ),
    [],
  );
});

test('rejects an approval comment that was not made by the repository owner', () => {
  const payload = {
    taskId: validApprovalManifest.id,
    planDigest: validApprovalManifest.approval.planDigest,
    baselineCommit: validApprovalManifest.approval.baselineCommit,
    approvedAt: validApprovalManifest.approval.approvedAt,
    expiresAt: validApprovalManifest.approval.expiresAt,
    allowedFiles: validApprovalManifest.approval.allowedFiles,
    roleScope: validApprovalManifest.approval.roleScope,
    allowedStateChanges: validApprovalManifest.approval.allowedStateChanges,
  };
  assert.deepEqual(
    validateGitHubApprovalRecord(
      validApprovalManifest,
      {
        html_url: validApprovalManifest.approval.recordUrl,
        user: { login: validApprovalManifest.approval.approvedBy },
        author_association: 'COLLABORATOR',
        body: `<!-- qlickhub-agent-approval:v1\n${JSON.stringify(payload)}\n-->`,
      },
      { baseCommit: validApprovalManifest.approval.baselineCommit },
    ),
    ['AGENT-APPROVAL-123 approval comment author must be the repository owner.'],
  );
});

test('reports an external approval whose payload differs from its manifest', async () => {
  const result = await resolveGitHubApprovals({
    changedFiles: validApprovalManifest.changedFiles,
    manifests: [validApprovalManifest],
    repository: 'example/qlickhub',
    token: 'test-token',
    baseCommit: validApprovalManifest.approval.baselineCommit,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        html_url: validApprovalManifest.approval.recordUrl,
        user: { login: validApprovalManifest.approval.approvedBy },
        author_association: 'OWNER',
        body: '<!-- qlickhub-agent-approval:v1\n{}\n-->',
      }),
    }),
  });

  assert.deepEqual(result.issues, [
    'AGENT-APPROVAL-123 approval comment payload does not match the manifest scope.',
  ]);
});

test('excludes a stale approval manifest that only overlaps the current diff on TODO.md', async () => {
  const staleManifest = structuredClone(validApprovalManifest);
  staleManifest.id = 'AGENT-APPROVAL-STALE';
  staleManifest.changedFiles = ['TODO.md', 'docs/plans/HISTORICAL_PLAN.md'];
  staleManifest.approval.allowedFiles = [...staleManifest.changedFiles];
  staleManifest.approval.recordId = 'stale-record';
  staleManifest.approval.baselineCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  const currentManifest = structuredClone(validApprovalManifest);
  currentManifest.id = 'AGENT-APPROVAL-CURRENT';
  currentManifest.changedFiles = ['TODO.md', 'scripts/checkQualityManifest.mjs'];
  currentManifest.approval.allowedFiles = [...currentManifest.changedFiles];
  currentManifest.approval.recordId = 'current-record';
  currentManifest.approval.baselineCommit = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  const commentFor = (manifest) => ({
    html_url: manifest.approval.recordUrl,
    user: { login: manifest.approval.approvedBy },
    author_association: 'OWNER',
    body: `<!-- qlickhub-agent-approval:v1\n${JSON.stringify({
      taskId: manifest.id,
      planDigest: manifest.approval.planDigest,
      baselineCommit: manifest.approval.baselineCommit,
      approvedAt: manifest.approval.approvedAt,
      expiresAt: manifest.approval.expiresAt,
      allowedFiles: manifest.approval.allowedFiles,
      roleScope: manifest.approval.roleScope,
      allowedStateChanges: manifest.approval.allowedStateChanges,
    })}\n-->`,
  });

  const result = await resolveGitHubApprovals({
    changedFiles: currentManifest.changedFiles,
    manifests: [staleManifest, currentManifest],
    repository: 'example/qlickhub',
    token: 'test-token',
    baseCommit: currentManifest.approval.baselineCommit,
    fetchImpl: async (url) => ({
      ok: true,
      json: async () =>
        url.includes('stale-record') ? commentFor(staleManifest) : commentFor(currentManifest),
    }),
  });

  assert.deepEqual(
    result.matchingVersion2Manifests.map((manifest) => manifest.id),
    ['AGENT-APPROVAL-CURRENT'],
  );
  assert.deepEqual(result.issues, []);
});

test('rejects a changed file without a version 2 approval manifest', async () => {
  const result = await resolveGitHubApprovals({
    changedFiles: ['apps/web/src/App.tsx'],
    manifests: [],
  });
  assert.deepEqual(result.issues, [
    'apps/web/src/App.tsx is not covered by a version 2 approval manifest.',
  ]);
});

test('derives and verifies the approval plan digest from the canonical plan path', () => {
  const manifest = structuredClone(validApprovalManifest);
  const plan = 'approved implementation plan';
  manifest.approval.planDigest = `sha256:${createHash('sha256').update(plan).digest('hex')}`;
  assert.equal(approvalPlanPath(manifest), 'docs/plans/AGENT_APPROVAL_123_PLAN.md');
  assert.deepEqual(
    validatePlanDigest(manifest, () => Buffer.from(plan)),
    [],
  );
  assert.deepEqual(
    validatePlanDigest(manifest, () => Buffer.from('changed plan')),
    [
      'AGENT-APPROVAL-123 approval planDigest does not match docs/plans/AGENT_APPROVAL_123_PLAN.md.',
    ],
  );
});

test('reports missing inferred evidence without masking the required scope', () => {
  const assessment = assessManifests(['apps/web/src/pages/ExamplePage.tsx'], [validManifest]);
  assert.deepEqual(assessment.requiredScopes, ['performance', 'ui']);
  assert.deepEqual(assessment.issues, ['QUALITY-123 has no collected evidence for performance.']);
});

test('preserves manifest validation errors in report mode', () => {
  const result = runQualityCheck({
    changedFiles: ['apps/api/src/modules/ai/geminiClient.ts'],
    manifests: [],
    manifestErrors: ['quality/manifests/broken.json is not valid JSON.'],
    mode: 'report',
  });
  assert.deepEqual(result.issues, [
    'quality/manifests/broken.json is not valid JSON.',
    'No manifest covers inferred ai scope.',
  ]);
});
