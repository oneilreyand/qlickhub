import type { ReadinessSnapshotV2 } from '@qlick/contracts';
import type { ReleaseReadinessViewState } from '../lib/hooks/useReleaseReadinessMap';

export const releaseReadinessFixtureIds = {
  feature: '10000000-0000-4000-8000-000000000001',
  qa: '10000000-0000-4000-8000-000000000002',
  signOff: '10000000-0000-4000-8000-000000000003',
};

export function createReleaseReadinessSnapshotFixture(ready = false): ReadinessSnapshotV2 {
  const developmentStatus = ready ? 'passed' : 'failed';
  return {
    schemaVersion: 2,
    capturedAt: '2026-08-22T10:00:00.000Z',
    featureTask: {
      id: releaseReadinessFixtureIds.feature,
      title: 'Checkout Feature',
      status: 'in_review',
      updatedAt: '2026-08-22T09:00:00.000Z',
    },
    subtasks: { total: 3, completed: ready ? 3 : 2 },
    development: { total: 2, completed: ready ? 2 : 1 },
    requirements: { total: 2, coveredByActiveTestCases: 2 },
    testExecution: {
      totalTestCases: 4,
      passed: 4,
      failed: 0,
      blocked: 0,
      skipped: 0,
      unexecuted: 0,
    },
    bugs: {
      total: 1,
      open: 0,
      inProgress: 0,
      resolved: 0,
      verified: 1,
      reopened: 0,
      criticalOrHighUnverified: 0,
    },
    qaSignOff: {
      id: releaseReadinessFixtureIds.signOff,
      decision: 'approved',
      signedBy: releaseReadinessFixtureIds.qa,
      signedAt: '2026-08-22T09:30:00.000Z',
    },
    evaluation: {
      ready,
      failedGateCodes: ready ? [] : ['development_completion'],
      gates: [
        {
          code: 'requirement_coverage',
          label: 'Requirement coverage',
          status: 'passed',
          reason: 'All 2 linked requirements are covered by active test cases.',
        },
        {
          code: 'latest_test_results',
          label: 'Latest Test Run results',
          status: 'passed',
          reason: 'Latest results passed for all 4 active mapped test cases.',
        },
        {
          code: 'critical_high_bugs',
          label: 'Critical/High bugs',
          status: 'passed',
          reason: 'No unverified Critical or High bugs are linked to this Feature / Story.',
        },
        {
          code: 'development_completion',
          label: 'Development completion',
          status: developmentStatus,
          reason: ready
            ? 'All 2 development subtasks are complete.'
            : '1/2 development subtasks are complete.',
        },
        {
          code: 'qa_sign_off',
          label: 'QA Sign-off',
          status: 'passed',
          reason: 'The latest QA Sign-off is approved.',
        },
      ],
    },
  };
}

export function createReleaseReadinessViewState(ready = false): ReleaseReadinessViewState {
  return {
    snapshot: createReleaseReadinessSnapshotFixture(ready),
    isLoading: false,
    error: null,
    permissionDenied: false,
  };
}
