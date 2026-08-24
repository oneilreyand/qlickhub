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
  getTestCase,
  getTestCaseImportErrorsCsv,
  listTestCaseActivity,
  listTestCaseImportAudits,
  listTestCases,
  listTestRuns,
  previewTestCaseImport,
  recordTestResult,
  updateTestCase,
} from './testManagementController.js';

export const testManagementRoutes = Router({ mergeParams: true });

testManagementRoutes.use(authenticate);

testManagementRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/test-executions',
  requireWorkspaceMember(),
  getTaskTestExecutions,
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
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  createTestCase,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId',
  requireWorkspaceMember(),
  getTestCase,
);
testManagementRoutes.patch(
  '/workspaces/:workspaceId/test-cases/:testCaseId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  updateTestCase,
);

// Execution routes
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs',
  requireWorkspaceMember(),
  listTestRuns,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  createTestRun,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs/:testRunId/results',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  recordTestResult,
);
testManagementRoutes.post(
  '/workspaces/:workspaceId/test-cases/:testCaseId/runs/:testRunId/evidence-links',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  addTestResultEvidenceLink,
);
testManagementRoutes.get(
  '/workspaces/:workspaceId/test-cases/:testCaseId/activity',
  requireWorkspaceMember(),
  listTestCaseActivity,
);
