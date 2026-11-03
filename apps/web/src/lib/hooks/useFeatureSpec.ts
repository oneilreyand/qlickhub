import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeatureSpec } from '@qlick/contracts';
import { featureSpecService } from '../api/featureSpecService';

export interface UseFeatureSpecResult {
  spec: FeatureSpec | null;
  isLoading: boolean;
  error: { status?: number; message: string } | null;
  setSpec: (spec: FeatureSpec) => void;
  reload: () => void;
}

/**
 * Memuat Feature Spec milik root Feature. `spec` null berarti Feature belum punya Spec (dibuat
 * lewat alur lama). Error dibedakan dari ketiadaan Spec, agar draft tidak tersembunyi saat gagal.
 */
export function useFeatureSpec(
  workspaceId: string | undefined,
  featureTaskId: string | null | undefined,
): UseFeatureSpecResult {
  const [spec, setSpec] = useState<FeatureSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const identity = useRef({ workspaceId, featureTaskId });
  identity.current = { workspaceId, featureTaskId };
  const acceptSpec = useCallback((candidate: FeatureSpec) => {
    if (
      candidate.workspaceId === identity.current.workspaceId &&
      candidate.featureTaskId === identity.current.featureTaskId
    )
      setSpec(candidate);
  }, []);

  useEffect(() => {
    if (!workspaceId || !featureTaskId) {
      setSpec(null);
      setError(null);
      return undefined;
    }
    let isCurrent = true;
    setIsLoading(true);
    setSpec(null);
    setError(null);
    void (async () => {
      try {
        const result = await featureSpecService.getByFeature(workspaceId, featureTaskId);
        if (isCurrent) setSpec(result);
      } catch (failure) {
        if (isCurrent)
          setError({
            status: (failure as { status?: number }).status,
            message: failure instanceof Error ? failure.message : 'Spec tidak dapat dimuat.',
          });
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, featureTaskId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { spec, isLoading, error, setSpec: acceptSpec, reload };
}
