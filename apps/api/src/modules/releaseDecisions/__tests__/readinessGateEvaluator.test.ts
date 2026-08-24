import assert from 'node:assert';
import { describe, test } from 'node:test';
import type { ReadinessGateFacts } from '../readinessGateEvaluator.js';
import { evaluateReadinessGates } from '../readinessGateEvaluator.js';

const approvedSignOff = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  decision: 'approved' as const,
  signedBy: '223e4567-e89b-42d3-a456-426614174001',
  signedAt: '2026-08-22T10:00:00.000Z',
};

const readyFacts: ReadinessGateFacts = {
  development: { total: 2, completed: 2 },
  requirements: { total: 2, coveredByActiveTestCases: 2 },
  testExecution: { totalTestCases: 3, passed: 3, failed: 0, blocked: 0, skipped: 0, unexecuted: 0 },
  bugs: {
    total: 1,
    open: 0,
    inProgress: 0,
    resolved: 0,
    verified: 1,
    reopened: 0,
    criticalOrHighUnverified: 0,
  },
  qaSignOff: approvedSignOff,
};

describe('readiness gate evaluator (AGY-5.2)', () => {
  test('returns the five passed gates in a stable order for release-ready facts', () => {
    const first = evaluateReadinessGates(readyFacts);
    const second = evaluateReadinessGates(readyFacts);

    assert.deepStrictEqual(first, second);
    assert.strictEqual(first.ready, true);
    assert.deepStrictEqual(first.failedGateCodes, []);
    assert.deepStrictEqual(
      first.gates.map((item) => item.code),
      [
        'requirement_coverage',
        'latest_test_results',
        'critical_high_bugs',
        'development_completion',
        'qa_sign_off',
      ],
    );
    assert.ok(first.gates.every((item) => item.status === 'passed'));
  });

  test('returns deterministic reasons for every failed gate', () => {
    const result = evaluateReadinessGates({
      development: { total: 2, completed: 1 },
      requirements: { total: 2, coveredByActiveTestCases: 1 },
      testExecution: {
        totalTestCases: 3,
        passed: 1,
        failed: 1,
        blocked: 0,
        skipped: 1,
        unexecuted: 0,
      },
      bugs: {
        total: 2,
        open: 1,
        inProgress: 0,
        resolved: 1,
        verified: 0,
        reopened: 0,
        criticalOrHighUnverified: 2,
      },
      qaSignOff: { ...approvedSignOff, decision: 'rejected' },
    });

    assert.strictEqual(result.ready, false);
    assert.deepStrictEqual(result.failedGateCodes, [
      'requirement_coverage',
      'latest_test_results',
      'critical_high_bugs',
      'development_completion',
      'qa_sign_off',
    ]);
    assert.deepStrictEqual(
      result.gates.map((item) => item.reason),
      [
        '1/2 linked requirements are covered by active test cases.',
        'Latest results: 1/3 passed, 1 failed, 0 blocked, 1 skipped, 0 unexecuted.',
        '2 unverified Critical or High bugs remain.',
        '1/2 development subtasks are complete.',
        'The latest QA Sign-off is rejected.',
      ],
    );
  });

  test('treats missing requirements, tests, development work, and QA Sign-off as failed readiness signals', () => {
    const result = evaluateReadinessGates({
      ...readyFacts,
      development: { total: 0, completed: 0 },
      requirements: { total: 0, coveredByActiveTestCases: 0 },
      testExecution: {
        totalTestCases: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        unexecuted: 0,
      },
      qaSignOff: null,
    });

    assert.strictEqual(result.ready, false);
    assert.deepStrictEqual(result.failedGateCodes, [
      'requirement_coverage',
      'latest_test_results',
      'development_completion',
      'qa_sign_off',
    ]);
  });
});
