import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateExecutionPolicy as evaluateWithContext,
  redactForAudit,
  validateExecutionRecord,
} from './checkExecutionRecord.mjs';

const now = '2026-10-02T12:00:00.000Z';
const knownPolicyIds = new Set(['AI-009', 'AI-015', 'AI-016', 'AI-018', 'AI-019', 'DOC-004']);
const baselineCommit = 'a'.repeat(40);

function evaluateExecutionPolicy(record, request = {}) {
  return evaluateWithContext(record, { now, knownPolicyIds, baselineCommit, ...request });
}

// Contract-valid test factory; this is not a live record or a runtime capability.
function validRecord() {
  return {
    version: 1,
    taskId: 'POLICY-DRY-RUN-1',
    mode: 'dry-run',
    baselineCommit: 'a'.repeat(40),
    allowedPaths: ['docs/example.md'],
    requestedCapabilities: ['fs:read', 'exec:test'],
    prohibitedCapabilities: ['fs:write', 'deploy:production', 'secret:read'],
    stateChanges: ['validate a dry-run policy decision'],
    acceptanceCriteria: [
      {
        id: 'AC-1',
        evidenceLevel: 'E2',
        description: 'A valid dry-run decision is returned.',
        evidenceCommand: 'npm run agent:policy:test',
      },
    ],
    evidenceCommands: ['npm run agent:policy:test'],
    executor: 'executor-a',
    verifier: 'ci-policy-job',
    leaseExpiresAt: '2026-10-03T12:00:00.000Z',
    retryLimit: 0,
    timeoutMinutes: 10,
    costBudgetUsd: 0,
    recovery: {
      rollbackTarget: 'no state changed',
      quarantineAction: 'stop and retain denial evidence',
    },
    policyIds: ['AI-009', 'AI-015', 'AI-016', 'AI-018', 'AI-019', 'DOC-004'],
  };
}

test('accepts a complete scoped dry-run record', () => {
  assert.deepEqual(validateExecutionRecord(validRecord(), { now, knownPolicyIds }), []);
});

test('rejects an incomplete record before it can be evaluated', () => {
  const record = validRecord();
  delete record.leaseExpiresAt;
  record.recovery = { rollbackTarget: '' };

  const errors = validateExecutionRecord(record, { now, knownPolicyIds });
  assert.ok(errors.some((error) => error.includes('leaseExpiresAt')));
  assert.ok(errors.some((error) => error.includes('recovery.quarantineAction')));
});

test('rejects a write capability in read-only mode', () => {
  const record = validRecord();
  record.mode = 'read-only';
  record.requestedCapabilities = ['fs:read', 'fs:write'];

  assert.ok(
    validateExecutionRecord(record, { now, knownPolicyIds }).some((error) =>
      error.includes('read-only mode cannot request fs:write'),
    ),
  );
});

test('denies a target outside the exact record scope without issuing a capability', () => {
  const decision = evaluateExecutionPolicy(validRecord(), {
    targetPath: 'apps/api/src/server.ts',
    capability: 'fs:read',
    now,
    knownPolicyIds,
  });

  assert.equal(decision.decision, 'deny');
  assert.equal(decision.capabilityIssued, false);
  assert.ok(decision.reasons.some((reason) => reason.includes('outside allowedPaths')));
});

test('denies an expired record', () => {
  const record = validRecord();
  record.leaseExpiresAt = '2026-10-01T12:00:00.000Z';

  const decision = evaluateExecutionPolicy(record, {
    targetPath: 'docs/example.md',
    capability: 'fs:read',
    now,
    knownPolicyIds,
  });

  assert.equal(decision.decision, 'deny');
  assert.ok(decision.reasons.some((reason) => reason.includes('lease has expired')));
});

test('allows a valid dry-run decision without issuing a token', () => {
  const decision = evaluateExecutionPolicy(validRecord(), {
    targetPath: 'docs/example.md',
    capability: 'exec:test',
    now,
    knownPolicyIds,
  });

  assert.deepEqual(decision, {
    decision: 'allow',
    capabilityIssued: false,
    reasons: [],
    audit: {
      taskId: 'POLICY-DRY-RUN-1',
      mode: 'dry-run',
      baselineCommit,
      evaluatedAt: now,
      clockSource: 'system',
      targetPath: 'docs/example.md',
      capability: 'exec:test',
      executor: 'executor-a',
      verifier: 'ci-policy-job',
    },
  });
});

test('denies Production deployment capability in the local dry-run', () => {
  const record = validRecord();
  record.requestedCapabilities.push('deploy:production');
  record.prohibitedCapabilities = record.prohibitedCapabilities.filter(
    (capability) => capability !== 'deploy:production',
  );

  const decision = evaluateExecutionPolicy(record, {
    targetPath: 'docs/example.md',
    capability: 'deploy:production',
    now,
    knownPolicyIds,
  });

  assert.equal(decision.decision, 'deny');
  assert.ok(decision.reasons.some((reason) => reason.includes('not available in local dry-run')));
});

test('redacts secret-shaped values before audit output', () => {
  assert.equal(
    redactForAudit('DATABASE_URL=postgres://user:password@example.test/db'),
    'DATABASE_URL=[REDACTED]',
  );
  assert.equal(
    redactForAudit('Authorization: Bearer abc.def.ghi'),
    'Authorization: Bearer [REDACTED]',
  );
});

test('denies a baseline that differs from observed Git HEAD', () => {
  const decision = evaluateExecutionPolicy(validRecord(), {
    targetPath: 'docs/example.md',
    capability: 'fs:read',
    baselineCommit: 'b'.repeat(40),
  });
  assert.equal(decision.decision, 'deny');
  assert.ok(decision.reasons.some((reason) => reason.includes('does not match observed Git HEAD')));
});

test('denies when authoritative baseline or policy registry is unavailable', () => {
  for (const context of [
    { baselineCommit: undefined },
    { knownPolicyIds: undefined },
    { knownPolicyIds: new Set() },
  ]) {
    const decision = evaluateExecutionPolicy(validRecord(), {
      targetPath: 'docs/example.md',
      capability: 'fs:read',
      ...context,
    });
    assert.equal(decision.decision, 'deny');
    assert.equal(decision.capabilityIssued, false);
  }
});

test('denies invalid clocks and calendar dates instead of bypassing expiry', () => {
  for (const invalidTime of ['invalid', '2026-10-02', '2026-02-30T12:00:00.000Z']) {
    const decision = evaluateExecutionPolicy(validRecord(), {
      targetPath: 'docs/example.md',
      capability: 'fs:read',
      now: invalidTime,
    });
    assert.equal(decision.decision, 'deny');
    assert.equal(decision.audit.evaluatedAt, null);
  }
});

test('accepts read-only with no planned state changes', () => {
  const record = validRecord();
  record.mode = 'read-only';
  record.stateChanges = [];
  assert.deepEqual(validateExecutionRecord(record, { now, knownPolicyIds }), []);
});

test('rejects state changes declared in read-only mode', () => {
  const record = validRecord();
  record.mode = 'read-only';
  assert.ok(
    validateExecutionRecord(record, { now, knownPolicyIds }).some((error) =>
      error.includes('must have no stateChanges'),
    ),
  );
});

test('requires each acceptance criterion to map to a declared evidence command', () => {
  const record = validRecord();
  record.acceptanceCriteria[0].evidenceCommand = 'unlisted command';
  assert.ok(
    validateExecutionRecord(record, { now, knownPolicyIds }).some((error) =>
      error.includes('declared evidenceCommand'),
    ),
  );
});

test('rejects a claim-only acceptance criterion', () => {
  const record = validRecord();
  record.acceptanceCriteria[0].evidenceLevel = 'E0';
  assert.ok(
    validateExecutionRecord(record, { now, knownPolicyIds }).some((error) =>
      error.includes('invalid evidenceLevel'),
    ),
  );
});

test('rejects the executor accepting its own work', () => {
  const record = validRecord();
  record.verifier = record.executor;
  assert.ok(
    validateExecutionRecord(record, { now, knownPolicyIds }).some((error) =>
      error.includes('distinct from executor'),
    ),
  );
});

test('rejects unsafe paths even if an agent lists them in scope', () => {
  for (const targetPath of [
    '../outside.md',
    '/private/tmp/file',
    'C:/secrets',
    'docs\\file.md',
    '.',
    'docs/',
    'docs/./file.md',
    'docs/line\nfile',
  ]) {
    const record = validRecord();
    record.allowedPaths = [targetPath];
    const decision = evaluateExecutionPolicy(record, { targetPath, capability: 'fs:read' });
    assert.equal(decision.decision, 'deny');
    assert.equal(decision.audit.targetPath, null);
  }
});

test('denies null and malformed record shapes without throwing or exposing input', () => {
  for (const record of [null, [], {}, { mode: 'read-only' }]) {
    const decision = evaluateExecutionPolicy(record, {
      targetPath: 'docs/example.md',
      capability: 'fs:read',
    });
    assert.equal(decision.decision, 'deny');
    assert.equal(decision.capabilityIssued, false);
  }
});

test('rejects invalid limits rather than trusting agent declarations', () => {
  for (const override of [
    { retryLimit: -1 },
    { retryLimit: 4 },
    { timeoutMinutes: 0 },
    { timeoutMinutes: 61 },
    { costBudgetUsd: -1 },
    { costBudgetUsd: Number.NaN },
  ]) {
    const decision = evaluateExecutionPolicy(
      { ...validRecord(), ...override },
      { targetPath: 'docs/example.md', capability: 'fs:read' },
    );
    assert.equal(decision.decision, 'deny');
  }
});

test('rejects unknown policies and undeclared capabilities', () => {
  const record = validRecord();
  record.policyIds.push('FAKE-999');
  const decision = evaluateExecutionPolicy(record, {
    targetPath: 'docs/example.md',
    capability: 'fs:write',
  });
  assert.equal(decision.decision, 'deny');
  assert.ok(decision.reasons.some((reason) => reason.includes('unknown Policy ID')));
  assert.ok(decision.reasons.some((reason) => reason.includes('not declared')));
});

test('rejects recognised secret material and suppresses it in the full decision output', () => {
  const record = validRecord();
  // Synthetic test markers only, never credentials copied from an environment.
  const marker = 'DATABASE_URL=postgres://fixture:synthetic-only@example.invalid/fixture';
  record.executor = marker;
  record.stateChanges = [marker];
  record.requestedCapabilities.push(marker);
  const decision = evaluateExecutionPolicy(record, {
    targetPath: `docs/${marker}`,
    capability: marker,
  });
  const serialized = JSON.stringify(decision);
  assert.equal(decision.decision, 'deny');
  assert.equal(decision.audit.executor, null);
  assert.equal(decision.audit.targetPath, null);
  assert.equal(serialized.includes('synthetic-only'), false);
  assert.equal(serialized.includes(marker), false);
});

test('labels an explicitly supplied simulation clock in audit output', () => {
  const decision = evaluateExecutionPolicy(validRecord(), {
    targetPath: 'docs/example.md',
    capability: 'fs:read',
    clockSource: 'simulation',
  });
  assert.equal(decision.decision, 'allow');
  assert.equal(decision.audit.clockSource, 'simulation');
  assert.equal(decision.capabilityIssued, false);
});
