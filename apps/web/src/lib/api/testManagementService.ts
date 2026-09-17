import type {
  CommitTestCaseImportInput,
  AddTestResultEvidenceSupplementInput,
  CreateQaTestCycleInput,
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
  TestCaseVersionCoverageSummary,
  TestCaseVersionAcceptanceCriteriaResponse,
  TestCaseVersionAcceptanceCriterionMapping,
  QaTestCycle,
  QaWorkflowSummary,
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

  async getQaWorkflowSummary(workspaceId: string, qaSubtaskId: string): Promise<QaWorkflowSummary> {
    const response = await apiClient<{ summary: QaWorkflowSummary }>(
      `/workspaces/${workspaceId}/tasks/${qaSubtaskId}/qa-workflow-summary`,
    );
    return response.summary;
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

  async listTestCaseVersionCoverage(
    workspaceId: string,
    testCaseId: string,
  ): Promise<TestCaseVersionCoverageSummary[]> {
    const response = await apiClient<{ versions: TestCaseVersionCoverageSummary[] }>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}/versions`,
    );
    return response.versions;
  },

  async listTestCaseVersionAcceptanceCriteria(
    workspaceId: string,
    testCaseId: string,
    testCaseVersionId: string,
  ): Promise<TestCaseVersionAcceptanceCriteriaResponse> {
    return apiClient<TestCaseVersionAcceptanceCriteriaResponse>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}/versions/${testCaseVersionId}/acceptance-criteria`,
    );
  },

  async replaceTestCaseVersionAcceptanceCriteria(
    workspaceId: string,
    testCaseId: string,
    testCaseVersionId: string,
    mappings: TestCaseVersionAcceptanceCriterionMapping[],
  ): Promise<TestCaseVersionAcceptanceCriteriaResponse> {
    return apiClient<TestCaseVersionAcceptanceCriteriaResponse>(
      `/workspaces/${workspaceId}/test-cases/${testCaseId}/versions/${testCaseVersionId}/acceptance-criteria`,
      { method: 'PUT', body: JSON.stringify({ mappings }) },
    );
  },

  async listQaTestCycles(
    workspaceId: string,
    featureTaskId: string,
    qaSubtaskId?: string,
  ): Promise<QaTestCycle[]> {
    const params: Record<string, string> = { featureTaskId };
    if (qaSubtaskId) params.qaSubtaskId = qaSubtaskId;
    const response = await apiClient<{ testCycles: QaTestCycle[] }>(
      `/workspaces/${workspaceId}/qa-test-cycles`,
      { params },
    );
    return response.testCycles;
  },

  async createQaTestCycle(
    workspaceId: string,
    input: Omit<CreateQaTestCycleInput, 'workspaceId'>,
  ): Promise<QaTestCycle> {
    const response = await apiClient<{ testCycle: QaTestCycle }>(
      `/workspaces/${workspaceId}/qa-test-cycles`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.testCycle;
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
    input: Omit<CreateTestRunInput, 'workspaceId' | 'testCaseId'>,
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
    input: AddTestResultEvidenceSupplementInput,
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
