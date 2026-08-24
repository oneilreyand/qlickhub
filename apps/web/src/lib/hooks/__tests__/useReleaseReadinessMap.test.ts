import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createReleaseReadinessSnapshotFixture,
  releaseReadinessFixtureIds,
} from '../../../test/releaseReadinessFixture';
import { useReleaseReadinessMap } from '../useReleaseReadinessMap';

const releaseServiceMocks = vi.hoisted(() => ({
  listWorkspaceReleaseReadiness: vi.fn(),
}));

vi.mock('../../api/releaseDecisionService', () => ({
  releaseDecisionService: releaseServiceMocks,
}));

const workspaceId = '20000000-0000-4000-8000-000000000001';
const secondFeatureId = '10000000-0000-4000-8000-000000000004';

describe('useReleaseReadinessMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates one batch request and maps persisted snapshots by Feature', async () => {
    releaseServiceMocks.listWorkspaceReleaseReadiness.mockResolvedValue({
      workspaceId,
      items: [
        {
          featureTaskId: releaseReadinessFixtureIds.feature,
          currentReadinessSnapshot: createReleaseReadinessSnapshotFixture(),
        },
      ],
    });

    const { result } = renderHook(() =>
      useReleaseReadinessMap(workspaceId, [
        secondFeatureId,
        releaseReadinessFixtureIds.feature,
        releaseReadinessFixtureIds.feature,
      ]),
    );

    await waitFor(() =>
      expect(
        result.current.stateByFeatureTaskId[releaseReadinessFixtureIds.feature]?.isLoading,
      ).toBe(false),
    );
    expect(releaseServiceMocks.listWorkspaceReleaseReadiness).toHaveBeenCalledTimes(1);
    expect(releaseServiceMocks.listWorkspaceReleaseReadiness).toHaveBeenCalledWith(workspaceId, [
      releaseReadinessFixtureIds.feature,
      secondFeatureId,
    ]);
    expect(
      result.current.stateByFeatureTaskId[releaseReadinessFixtureIds.feature]?.snapshot?.evaluation
        .ready,
    ).toBe(false);
    expect(result.current.stateByFeatureTaskId[secondFeatureId]?.error).toBe(
      'Release readiness unavailable.',
    );
  });

  it('maps a Workspace authorization rejection to every requested Feature', async () => {
    releaseServiceMocks.listWorkspaceReleaseReadiness.mockRejectedValue({ status: 403 });

    const { result } = renderHook(() =>
      useReleaseReadinessMap(workspaceId, [releaseReadinessFixtureIds.feature]),
    );

    await waitFor(() =>
      expect(
        result.current.stateByFeatureTaskId[releaseReadinessFixtureIds.feature]?.permissionDenied,
      ).toBe(true),
    );
    expect(
      result.current.stateByFeatureTaskId[releaseReadinessFixtureIds.feature]?.error,
    ).toBeNull();
  });

  it('splits more than 100 Features into bounded batch requests', async () => {
    const featureTaskIds = Array.from(
      { length: 101 },
      (_, index) => `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    );
    releaseServiceMocks.listWorkspaceReleaseReadiness.mockImplementation(
      async (_workspaceId: string, batch: string[]) => ({
        workspaceId,
        items: batch.map((featureTaskId) => ({
          featureTaskId,
          currentReadinessSnapshot: createReleaseReadinessSnapshotFixture(true),
        })),
      }),
    );

    const { result } = renderHook(() => useReleaseReadinessMap(workspaceId, featureTaskIds));

    await waitFor(() =>
      expect(result.current.stateByFeatureTaskId[featureTaskIds[100]]?.isLoading).toBe(false),
    );
    expect(releaseServiceMocks.listWorkspaceReleaseReadiness).toHaveBeenCalledTimes(2);
    expect(releaseServiceMocks.listWorkspaceReleaseReadiness.mock.calls[0][1]).toHaveLength(100);
    expect(releaseServiceMocks.listWorkspaceReleaseReadiness.mock.calls[1][1]).toHaveLength(1);
  });
});
