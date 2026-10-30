import { useCallback, useEffect, useState } from 'react';
import type { FeatureSpec } from '@qlick/contracts';
import { featureSpecService } from '../api/featureSpecService';

export interface UseFeatureSpecResult {
  spec: FeatureSpec | null;
  isLoading: boolean;
  setSpec: (spec: FeatureSpec) => void;
  reload: () => void;
}

/**
 * Memuat Feature Spec milik root Feature. `spec` null berarti Feature belum punya Spec (dibuat
 * lewat alur lama) atau gagal dimuat; tampilan lama tetap dipakai, tidak ada yang terkunci.
 */
export function useFeatureSpec(
  workspaceId: string | undefined,
  featureTaskId: string | null | undefined,
): UseFeatureSpecResult {
  const [spec, setSpec] = useState<FeatureSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!workspaceId || !featureTaskId) {
      setSpec(null);
      return undefined;
    }
    let isCurrent = true;
    setIsLoading(true);
    void (async () => {
      try {
        const result = await featureSpecService.getByFeature(workspaceId, featureTaskId);
        if (isCurrent) setSpec(result);
      } catch {
        if (isCurrent) setSpec(null);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, featureTaskId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { spec, isLoading, setSpec, reload };
}
