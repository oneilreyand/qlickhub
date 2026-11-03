import { beforeEach, describe, expect, it, vi } from 'vitest';
import { featureSpecFixture } from '../../../test/featureSpecFixture';
import { apiClient } from '../apiClient';
import { featureSpecService } from '../featureSpecService';
vi.mock('../apiClient', () => ({ apiClient: vi.fn() }));
describe('Feature Spec client shared contracts', () => {
  beforeEach(() => vi.clearAllMocks());
  it('sends the reviewed version and replacement consent to each AI draft endpoint', async () => {
    const spec = featureSpecFixture();
    vi.mocked(apiClient).mockResolvedValue({ featureSpec: spec });
    await featureSpecService.generatePrd(spec.workspaceId, spec.id, spec.version, true);
    expect(apiClient).toHaveBeenLastCalledWith(
      `/workspaces/${spec.workspaceId}/feature-specs/${spec.id}/generate/prd`,
      { method: 'POST', body: JSON.stringify({ version: 4, replace: true }) },
    );
    await featureSpecService.generateTasks(spec.workspaceId, spec.id, spec.version);
    expect(apiClient).toHaveBeenLastCalledWith(
      `/workspaces/${spec.workspaceId}/feature-specs/${spec.id}/generate/tasks`,
      { method: 'POST', body: JSON.stringify({ version: 4, replace: false }) },
    );
  });
  it('rejects an invalid Apply receipt rather than presenting a false success', async () => {
    const spec = featureSpecFixture();
    vi.mocked(apiClient).mockResolvedValue({ featureSpec: spec });
    await expect(
      featureSpecService.apply(spec.workspaceId, spec.id, 4, 'reviewed-key'),
    ).rejects.toThrow();
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${spec.workspaceId}/feature-specs/${spec.id}/apply`,
      { method: 'POST', body: JSON.stringify({ version: 4, idempotencyKey: 'reviewed-key' }) },
    );
  });
});
