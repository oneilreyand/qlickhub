import type {
  CreateRequirementFindingClarificationInput,
  CreateRequirementFindingGovernanceDecisionInput,
  CreateRequirementFindingInput,
  CreateRequirementFindingStatusEventInput,
  CreateRequirementFindingTriagePositionInput,
  RequirementFinding,
  RequirementFindingState,
} from '@qlick/contracts';
import { RequirementFindingSchema, RequirementFindingStateSchema } from '@qlick/contracts';
import { apiClient } from './apiClient';

const basePath = (workspaceId: string, featureTaskId: string) =>
  `/workspaces/${workspaceId}/features/${featureTaskId}/readiness/findings`;

async function mutate(path: string, body: Record<string, unknown>): Promise<RequirementFinding> {
  const response = await apiClient<{ finding: unknown }>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return RequirementFindingSchema.parse(response.finding);
}

export const requirementFindingService = {
  async getState(workspaceId: string, featureTaskId: string): Promise<RequirementFindingState> {
    const response = await apiClient<{ findingState: unknown }>(
      basePath(workspaceId, featureTaskId),
    );
    return RequirementFindingStateSchema.parse(response.findingState);
  },

  createFinding(
    workspaceId: string,
    featureTaskId: string,
    input: Omit<CreateRequirementFindingInput, 'workspaceId' | 'featureTaskId'>,
  ) {
    return mutate(basePath(workspaceId, featureTaskId), input);
  },

  addClarification(
    workspaceId: string,
    featureTaskId: string,
    findingId: string,
    input: Pick<CreateRequirementFindingClarificationInput, 'message'>,
  ) {
    return mutate(`${basePath(workspaceId, featureTaskId)}/${findingId}/clarifications`, input);
  },

  addTriagePosition(
    workspaceId: string,
    featureTaskId: string,
    findingId: string,
    input: Pick<CreateRequirementFindingTriagePositionInput, 'classification' | 'rationale'>,
  ) {
    return mutate(`${basePath(workspaceId, featureTaskId)}/${findingId}/triage-positions`, input);
  },

  recordGovernanceDecision(
    workspaceId: string,
    featureTaskId: string,
    findingId: string,
    input: Pick<CreateRequirementFindingGovernanceDecisionInput, 'classification' | 'rationale'>,
  ) {
    return mutate(
      `${basePath(workspaceId, featureTaskId)}/${findingId}/governance-decisions`,
      input,
    );
  },

  changeStatus(
    workspaceId: string,
    featureTaskId: string,
    findingId: string,
    input: Pick<CreateRequirementFindingStatusEventInput, 'action' | 'reason'>,
  ) {
    return mutate(`${basePath(workspaceId, featureTaskId)}/${findingId}/status-events`, input);
  },
};
