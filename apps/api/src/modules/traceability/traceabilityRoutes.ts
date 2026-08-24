import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  getTraceabilitySummary,
  getParentTaskDeliveryTrace,
  listRequirementTestCases,
  createRequirementTestCase,
  updateTestCaseStatus,
} from './traceabilityController.js';

export const traceabilityRoutes = Router({ mergeParams: true });

traceabilityRoutes.use(authenticate);

// Traceability Matrix summary for workspace
traceabilityRoutes.get(
  '/workspaces/:workspaceId/traceability',
  requireWorkspaceMember(),
  getTraceabilitySummary,
);

traceabilityRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/delivery-trace',
  requireWorkspaceMember(),
  getParentTaskDeliveryTrace,
);

// Requirement Test Cases endpoints
traceabilityRoutes.get(
  '/workspaces/:workspaceId/requirements/:requirementId/test-cases',
  requireWorkspaceMember(),
  listRequirementTestCases,
);

traceabilityRoutes.post(
  '/workspaces/:workspaceId/requirements/:requirementId/test-cases',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  createRequirementTestCase,
);

traceabilityRoutes.patch(
  '/workspaces/:workspaceId/requirements/:requirementId/test-cases/:testCaseId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  updateTestCaseStatus,
);

traceabilityRoutes.patch(
  '/workspaces/:workspaceId/requirement-test-cases/:testCaseId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  updateTestCaseStatus,
);
