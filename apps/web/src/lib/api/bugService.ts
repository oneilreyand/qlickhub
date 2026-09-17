import type {
  Bug,
  BugEvidenceLink,
  BugWithContext,
  CreateBugEvidenceLinkInput,
  CreateBugInput,
  ListBugsQuery,
  UpdateBugInput,
  CreateBugResolutionEventInput,
  CreateBugRetestAttemptInput,
  BugResolutionEvent,
  BugRetestAttempt,
  BugRetestHistory,
  BugRetestRun,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export const bugService = {
  async createBug(workspaceId: string, input: Omit<CreateBugInput, 'workspaceId'>): Promise<Bug> {
    const response = await apiClient<{ bug: Bug }>(`/workspaces/${workspaceId}/bugs`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.bug;
  },

  async listBugs(
    workspaceId: string,
    query: Partial<ListBugsQuery> = {},
  ): Promise<BugWithContext[]> {
    const params: Record<string, string> = {};
    if (query.featureTaskId) params.featureTaskId = query.featureTaskId;
    if (query.requirementId) params.requirementId = query.requirementId;
    if (query.testResultId) params.testResultId = query.testResultId;
    if (query.assigneeId) params.assigneeId = query.assigneeId;
    if (query.status) params.status = query.status;
    if (query.queue) params.queue = query.queue;
    const response = await apiClient<{ bugs: BugWithContext[] }>(
      `/workspaces/${workspaceId}/bugs`,
      { params },
    );
    return response.bugs;
  },

  async getBug(workspaceId: string, bugId: string): Promise<BugWithContext> {
    const response = await apiClient<{ bug: BugWithContext }>(
      `/workspaces/${workspaceId}/bugs/${bugId}`,
    );
    return response.bug;
  },

  async updateBug(
    workspaceId: string,
    bugId: string,
    input: Omit<UpdateBugInput, 'workspaceId' | 'bugId'>,
  ): Promise<BugWithContext> {
    const response = await apiClient<{ bug: BugWithContext }>(
      `/workspaces/${workspaceId}/bugs/${bugId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
    return response.bug;
  },
  async createResolutionEvent(
    workspaceId: string,
    bugId: string,
    input: Omit<CreateBugResolutionEventInput, 'workspaceId' | 'bugId'>,
  ): Promise<BugResolutionEvent> {
    const r = await apiClient<{ resolutionEvent: BugResolutionEvent }>(
      `/workspaces/${workspaceId}/bugs/${bugId}/resolution-events`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return r.resolutionEvent;
  },
  async createRetestAttempt(
    workspaceId: string,
    bugId: string,
    input: Omit<CreateBugRetestAttemptInput, 'workspaceId' | 'bugId'>,
  ): Promise<BugRetestAttempt> {
    const r = await apiClient<{ retestAttempt: BugRetestAttempt }>(
      `/workspaces/${workspaceId}/bugs/${bugId}/retest-attempts`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return r.retestAttempt;
  },
  async createRetestRun(workspaceId: string, bugId: string): Promise<BugRetestRun> {
    const response = await apiClient<{ retestRun: BugRetestRun }>(
      `/workspaces/${workspaceId}/bugs/${bugId}/retest-runs`,
      { method: 'POST' },
    );
    return response.retestRun;
  },
  async getRetestHistory(workspaceId: string, bugId: string): Promise<BugRetestHistory> {
    const response = await apiClient<{ history: BugRetestHistory }>(
      `/workspaces/${workspaceId}/bugs/${bugId}/retest-history`,
    );
    return response.history;
  },

  async addBugEvidenceLink(
    workspaceId: string,
    bugId: string,
    input: Omit<CreateBugEvidenceLinkInput, 'workspaceId' | 'bugId'>,
    kind: 'triage' | 'resolution' = 'triage',
  ): Promise<BugEvidenceLink> {
    const response = await apiClient<{ evidenceLink: BugEvidenceLink }>(
      `/workspaces/${workspaceId}/bugs/${bugId}/evidence-links?kind=${kind}`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.evidenceLink;
  },
};
