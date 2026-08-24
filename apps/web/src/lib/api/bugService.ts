import type {
  Bug,
  BugEvidenceLink,
  BugWithContext,
  CreateBugEvidenceLinkInput,
  CreateBugInput,
  ListBugsQuery,
  UpdateBugInput,
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
