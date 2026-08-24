import type { ParentTaskDeliveryTrace, Task } from '@qlick/contracts';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const featureTaskId = '20000000-0000-4000-8000-000000000001';
const subtaskId = '20000000-0000-4000-8000-000000000002';
const requirementId = '30000000-0000-4000-8000-000000000001';
const userId = '40000000-0000-4000-8000-000000000001';
const timestamp = '2026-08-21T00:00:00.000Z';

const featureTask: Task = {
  id: featureTaskId,
  workspaceId,
  folderId: null,
  parentTaskId: null,
  deliveryArea: null,
  title: 'Checkout Feature',
  description: 'Persisted checkout delivery work.',
  status: 'in_progress',
  priority: 'high',
  assigneeId: null,
  reporterId: userId,
  position: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const implementingSubtask: Task = {
  id: subtaskId,
  workspaceId,
  folderId: null,
  parentTaskId: featureTaskId,
  deliveryArea: 'frontend',
  title: 'Implement checkout summary',
  description: 'Render the final checkout summary.',
  status: 'done',
  priority: 'high',
  assigneeId: userId,
  reporterId: userId,
  position: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

export function createDeliveryTraceFixture(
  overrides: Partial<ParentTaskDeliveryTrace> = {},
): ParentTaskDeliveryTrace {
  const trace: ParentTaskDeliveryTrace = {
    workspaceId,
    requestedTaskId: featureTaskId,
    featureTask,
    featureSubtasks: [implementingSubtask],
    unlinkedSubtasks: [],
    testCaseLinkBasis: 'legacy_requirement',
    acceptanceCriterionCoverageAvailable: false,
    structural: {
      totalRequirements: 1,
      totalFeatureSubtasks: 1,
      linkedImplementingSubtasks: 1,
      unlinkedSubtasks: 0,
      requirementsWithImplementingSubtasks: 1,
      requirementsWithTestCases: 1,
      fullyCoveredRequirements: 1,
      missingImplementationRequirements: 0,
      missingTestCaseRequirements: 0,
      coveragePercent: 100,
    },
    execution: {
      totalTestCases: 1,
      executedTestCases: 1,
      passedTestCases: 1,
      failedTestCases: 0,
      pendingTestCases: 0,
      skippedTestCases: 0,
      passRatePercent: 100,
    },
    requirements: [
      {
        requirement: {
          id: requirementId,
          workspaceId,
          code: 'REQ-1',
          title: 'Review checkout before confirmation',
          description: 'The user reviews their order before confirming payment.',
          url: null,
          status: 'active',
          createdBy: userId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        acceptanceCriteria: [
          {
            id: '50000000-0000-4000-8000-000000000001',
            workspaceId,
            requirementId,
            sequence: 1,
            code: 'AC-1',
            text: 'Order and payment details are visible before confirmation.',
            status: 'active',
            createdBy: userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        implementingSubtasks: [implementingSubtask],
        testCases: [
          {
            id: '60000000-0000-4000-8000-000000000001',
            workspaceId,
            requirementId,
            title: 'Checkout summary is visible',
            testType: 'integration',
            status: 'passed',
            executionDetails: 'Verified against the persisted checkout response.',
            createdBy: userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        testCaseLinkBasis: 'legacy_requirement',
        acceptanceCriterionCoverageAvailable: false,
        structuralStatus: 'complete',
        executionStatus: 'passing',
        totalAcceptanceCriteria: 1,
        totalImplementingSubtasks: 1,
        totalTestCases: 1,
        executedTestCases: 1,
        passedTestCases: 1,
        failedTestCases: 0,
        pendingTestCases: 0,
        skippedTestCases: 0,
      },
    ],
  };

  return { ...trace, ...overrides };
}
