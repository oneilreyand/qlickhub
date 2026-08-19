import { apiClient } from './apiClient';
import {
  WorkspaceTraceabilitySummary,
  RequirementTestCase,
  TestCaseStatus,
} from '@qlick/contracts';

export const traceabilityService = {
  async getTraceabilitySummary(
    workspaceId: string
  ): Promise<WorkspaceTraceabilitySummary> {
    return await apiClient<WorkspaceTraceabilitySummary>(
      `/workspaces/${workspaceId}/traceability`
    );
  },

  async listRequirementTestCases(
    workspaceId: string,
    requirementId: string
  ): Promise<RequirementTestCase[]> {
    const res = await apiClient<{ testCases: RequirementTestCase[] }>(
      `/workspaces/${workspaceId}/requirements/${requirementId}/test-cases`
    );
    return res.testCases || [];
  },

  async createRequirementTestCase(
    workspaceId: string,
    requirementId: string,
    input: {
      title: string;
      testType?: string;
      status?: string;
      executionDetails?: string;
    }
  ): Promise<RequirementTestCase> {
    const res = await apiClient<{ testCase: RequirementTestCase }>(
      `/workspaces/${workspaceId}/requirements/${requirementId}/test-cases`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return res.testCase;
  },

  async updateTestCaseStatus(
    workspaceId: string,
    testCaseId: string,
    status: TestCaseStatus,
    executionDetails?: string
  ): Promise<RequirementTestCase> {
    const res = await apiClient<{ testCase: RequirementTestCase }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, executionDetails }),
      }
    );
    return res.testCase;
  },
};
