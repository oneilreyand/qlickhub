import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  addTestResultEvidenceLink,
  commitTestCaseImport,
  createTestCase,
  createTestRun,
  downloadTestCaseTemplate,
  getTaskTestExecutions,
  getQaWorkflowSummary,
  getTestCase,
  listTestCaseVersionCoverage,
  getTestCaseImportErrorsCsv,
  listTestCaseActivity,
  listTestCaseImportAudits,
  listTestCases,
  listTestRuns,
  previewTestCaseImport,
  recordTestResult,
  updateTestCase,
  replaceTestCaseVersionAcceptanceCriteria,
  listTestCaseVersionAcceptanceCriteria,
  listQaTestCycles,
  createQaTestCycle,
} from './testManagementController.js';

export const testManagementRoutes = Router({ mergeParams: true });

testManagementRoutes.use(authenticate);

testManagementRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/test-executions',
  requireWorkspaceMember(),
  getTaskTestExecutions,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/qa-workflow-summary',
  requireWorkspaceMember(['qa']),
  getQaWorkflowSummary,
);

testManagementRoutes.get(
  '/workspaces/:workspaceId/qa-test-cycles',
  requireWorkspaceMember(),
  listQaTestCycles,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/qa-test-cycles',
  requireWorkspaceMember(['qa']),
  createQaTestCycle,
);

// Import & Template routes (placed before parameter routes)
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/template',
  requireWorkspaceMember(),
  downloadTestCaseTemplate,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/import/preview',
  requireWorkspaceMember(),
  previewTestCaseImport,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/import/commit',
  requireWorkspaceMember(),
  commitTestCaseImport,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/import/audits',
  requireWorkspaceMember(),
  listTestCaseImportAudits,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/import/audits/:importId/errors',
  requireWorkspaceMember(),
  getTestCaseImportErrorsCsv,
);

// Test Case CRUD routes
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases',
  requireWorkspaceMember(),
  listTestCases,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases',
  requireWorkspaceMember(['qa']),
  createTestCase,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId',
  requireWorkspaceMember(),
  getTestCase,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId/versions',
  requireWorkspaceMember(),
  listTestCaseVersionCoverage,
);
testManagementRoutes.patch(
  '/workspaces/:workspaceId/test-cases/:testCaseId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  updateTestCase,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId/versions/:testCaseVersionId/acceptance-criteria',
  requireWorkspaceMember(),
  listTestCaseVersionAcceptanceCriteria,
);
testManagementRoutes.put(
  '/workspaces/:workspaceId/test-cases/:testCaseId/versions/:testCaseVersionId/acceptance-criteria',
  requireWorkspaceMember(['qa']),
  replaceTestCaseVersionAcceptanceCriteria,
);

// Execution routes
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs',
  requireWorkspaceMember(),
  listTestRuns,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs',
  requireWorkspaceMember(['qa']),
  createTestRun,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs/:testRunId/results',
  requireWorkspaceMember(['qa']),
  recordTestResult,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs/:testRunId/evidence-links',
  requireWorkspaceMember(['qa']),
  addTestResultEvidenceLink,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId/activity',
  requireWorkspaceMember(),
  listTestCaseActivity,
);
