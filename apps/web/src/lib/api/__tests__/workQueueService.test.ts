import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoleAwareWorkQueueFixture } from '../../../test/workQueueFixture';

const apiMocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  apiClient: apiMocks.apiClient,
}));

import { workQueueService } from '../workQueueService';

describe('workQueueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and validates the authenticated role-aware queue response', async () => {
    const queue = createRoleAwareWorkQueueFixture('qa');
    apiMocks.apiClient.mockResolvedValue({ queue });

    await expect(workQueueService.getRoleAwareQueue(queue.workspaceId)).resolves.toEqual(queue);
    expect(apiMocks.apiClient).toHaveBeenCalledWith(
      `/workspaces/${queue.workspaceId}/my-work-queue`,
    );
  });

  it('rejects a response that violates the shared queue contract', async () => {
    const queue = createRoleAwareWorkQueueFixture();
    apiMocks.apiClient.mockResolvedValue({
      queue: { ...queue, buckets: [{ ...queue.buckets[0], items: [{ title: '' }] }] },
    });

    await expect(workQueueService.getRoleAwareQueue(queue.workspaceId)).rejects.toThrow();
  });
});
