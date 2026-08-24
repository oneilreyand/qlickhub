import type {
  CommitTestCaseImportInput,
  CreateEvidenceLinkInput,
  CreateTestCaseInput,
  CreateTestResultInput,
  CreateTestRunInput,
  ListTestCasesQuery,
  TaskTestExecutionWorkspace,
  TestCase,
  TestCaseImportAudit,
  TestCaseImportPreviewResponse,
  TestCaseImportResult,
  TestResultEvidenceLink,
  TestRun,
  UpdateTestCaseInput,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export const testManagementService = {
  async getTaskTestExecutions(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskTestExecutionWorkspace> {
    const response = await apiClient<{ executionWorkspace: TaskTestExecutionWorkspace }>(
      `/workspaces/${workspaceId}/tasks/${taskId}/test-executions`,
    );
    return response.executionWorkspace;
  },

  async listTestCases(workspaceId: string, query?: ListTestCasesQuery): Promise<TestCase[]> {
    const params: Record<string, string> = {};
    if (query?.status) params.status = query.status;
    if (query?.requirementId) params.requirementId = query.requirementId;
    if (query?.search) params.search = query.search;

    const response = await apiClient<{ testCases: TestCase[] }>(
      `/workspaces/${workspaceId}/test-cases`,
      { params },
    );
    return response.testCases;
  },

  async getTestCase(workspaceId: string, testCaseId: string): Promise<TestCase> {
    const response = await apiClient<{ testCase: TestCase }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}`,
    );
    return response.testCase;
  },

  async createTestCase(
    workspaceId: string,
    input: Omit<CreateTestCaseInput, 'workspaceId'>,
  ): Promise<TestCase> {
    const response = await apiClient<{ testCase: TestCase }>(
      `/workspaces/${workspaceId}/test-cases`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.testCase;
  },

  async updateTestCase(
    workspaceId: string,
    testCaseId: string,
    input: Omit<UpdateTestCaseInput, 'workspaceId' | 'testCaseId'>,
  ): Promise<TestCase> {
    const response = await apiClient<{ testCase: TestCase }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
    return response.testCase;
  },

  async createTestRun(
    workspaceId: string,
    testCaseId: string,
    input: Pick<CreateTestRunInput, 'build' | 'environment'>,
  ): Promise<TestRun> {
    const response = await apiClient<{ testRun: TestRun }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}/runs`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.testRun;
  },

  async recordTestResult(
    workspaceId: string,
    testCaseId: string,
    testRunId: string,
    input: Pick<
      CreateTestResultInput,
      'status' | 'actualResult' | 'notes' | 'evidenceAttachmentIds' | 'evidenceLinks'
    >,
  ): Promise<TestRun> {
    const response = await apiClient<{ testRun: TestRun }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}/runs/${testRunId}/results`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.testRun;
  },

  async addTestResultEvidenceLink(
    workspaceId: string,
    testCaseId: string,
    testRunId: string,
    input: CreateEvidenceLinkInput,
  ): Promise<TestResultEvidenceLink> {
    const response = await apiClient<{ evidenceLink: TestResultEvidenceLink }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}/runs/${testRunId}/evidence-links`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.evidenceLink;
  },

  // Import operations
  async downloadTemplate(workspaceId: string): Promise<string> {
    const res = await fetch(`/v1/workspaces/${workspaceId}/test-cases/template`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download CSV template');
    return res.text();
  },

  async previewImport(
    workspaceId: string,
    fileName: string,
    fileContent?: string,
    fileBase64?: string,
    sheetName?: string,
    columnMapping?: Record<string, string>,
  ): Promise<TestCaseImportPreviewResponse> {
    const response = await apiClient<{ preview: TestCaseImportPreviewResponse }>(
      `/workspaces/${workspaceId}/test-cases/import/preview`,
      {
        method: 'POST',
        body: JSON.stringify({ fileName, fileContent, fileBase64, sheetName, columnMapping }),
      },
    );
    return response.preview;
  },

  async commitImport(
    workspaceId: string,
    input: Omit<CommitTestCaseImportInput, 'workspaceId'>,
  ): Promise<TestCaseImportResult> {
    const response = await apiClient<{ result: TestCaseImportResult }>(
      `/workspaces/${workspaceId}/test-cases/import/commit`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return response.result;
  },

  async listImportAudits(workspaceId: string): Promise<TestCaseImportAudit[]> {
    const response = await apiClient<{ audits: TestCaseImportAudit[] }>(
      `/workspaces/${workspaceId}/test-cases/import/audits`,
    );
    return response.audits;
  },

  async downloadErrorReport(workspaceId: string, importId: string): Promise<string> {
    const res = await fetch(
      `/v1/workspaces/${workspaceId}/test-cases/import/audits/${importId}/errors`,
      {
        credentials: 'include',
      },
    );
    if (!res.ok) throw new Error('Failed to download error report CSV');
    return res.text();
  },
};
