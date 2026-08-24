import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadinessSnapshotV2 } from '@qlick/contracts';
import { releaseDecisionService } from '../api/releaseDecisionService';

const RELEASE_READINESS_BATCH_SIZE = 100;

export interface ReleaseReadinessViewState {
  snapshot: ReadinessSnapshotV2 | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

export type ReleaseReadinessStateMap = Record<string, ReleaseReadinessViewState>;

export function useReleaseReadinessMap(workspaceId: string | undefined, featureTaskIds: string[]) {
  const featureTaskIdsKey = [...new Set(featureTaskIds.filter(Boolean))].sort().join(',');
  const normalizedFeatureTaskIds = useMemo(
    () => (featureTaskIdsKey ? featureTaskIdsKey.split(',') : []),
    [featureTaskIdsKey],
  );
  const [stateByFeatureTaskId, setStateByFeatureTaskId] = useState<ReleaseReadinessStateMap>({});
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!workspaceId || normalizedFeatureTaskIds.length === 0) {
      setStateByFeatureTaskId({});
      return;
    }

    setStateByFeatureTaskId(
      Object.fromEntries(
        normalizedFeatureTaskIds.map((featureTaskId) => [
          featureTaskId,
          {
            snapshot: null,
            isLoading: true,
            error: null,
            permissionDenied: false,
          },
        ]),
      ),
    );

    const batches: string[][] = [];
    for (
      let index = 0;
      index < normalizedFeatureTaskIds.length;
      index += RELEASE_READINESS_BATCH_SIZE
    ) {
      batches.push(normalizedFeatureTaskIds.slice(index, index + RELEASE_READINESS_BATCH_SIZE));
    }

    void Promise.all(
      batches.map((batch) =>
        releaseDecisionService.listWorkspaceReleaseReadiness(workspaceId, batch),
      ),
    )
      .then((responses) => {
        if (requestId !== requestIdRef.current) return;
        const snapshotByFeatureId = new Map(
          responses
            .flatMap((response) => response.items)
            .map((item) => [item.featureTaskId, item.currentReadinessSnapshot]),
        );
        setStateByFeatureTaskId(
          Object.fromEntries(
            normalizedFeatureTaskIds.map((featureTaskId) => [
              featureTaskId,
              {
                snapshot: snapshotByFeatureId.get(featureTaskId) || null,
                isLoading: false,
                error: snapshotByFeatureId.has(featureTaskId)
                  ? null
                  : 'Release readiness unavailable.',
                permissionDenied: false,
              },
            ]),
          ),
        );
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number(error.status)
            : undefined;
        setStateByFeatureTaskId(
          Object.fromEntries(
            normalizedFeatureTaskIds.map((featureTaskId) => [
              featureTaskId,
              {
                snapshot: null,
                isLoading: false,
                error:
                  status === 403
                    ? null
                    : error instanceof Error
                      ? error.message
                      : 'Release readiness unavailable.',
                permissionDenied: status === 403,
              },
            ]),
          ),
        );
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [normalizedFeatureTaskIds, reloadToken, workspaceId]);

  return { stateByFeatureTaskId, reload };
}
