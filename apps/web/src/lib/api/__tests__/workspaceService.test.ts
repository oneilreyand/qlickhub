import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  apiClient: apiMocks.apiClient,
}));

import { workspaceService } from '../workspaceService';

const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
const settings = {
  workspaceId,
  mode: 'observe' as const,
  updatedBy: '223e4567-e89b-12d3-a456-426614174001',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('workspaceService QA assurance rollout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the persisted rollout mode from the authenticated Workspace endpoint', async () => {
    apiMocks.apiClient.mockResolvedValue({ data: settings });

    await expect(workspaceService.getQaAssuranceRollout(workspaceId)).resolves.toEqual(settings);
    expect(apiMocks.apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/qa-assurance-rollout`,
    );
  });

  it('sends an explicit mode and reason to the authenticated mutation endpoint', async () => {
    const update = {
      mode: 'warn' as const,
      reason: 'Pilot peringatan telah disetujui oleh Workspace.',
    };
    apiMocks.apiClient.mockResolvedValue({ data: { ...settings, mode: 'warn' } });

    await expect(workspaceService.updateQaAssuranceRollout(workspaceId, update)).resolves.toEqual({
      ...settings,
      mode: 'warn',
    });
    expect(apiMocks.apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/qa-assurance-rollout`,
      { method: 'PATCH', body: JSON.stringify(update) },
    );
  });
});
