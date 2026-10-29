import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeaturePlan } from '@qlick/contracts';
import { featurePlanService } from '../api/featurePlanService';

export interface FeaturePlanState {
  plan: FeaturePlan | null;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: FeaturePlanState = { plan: null, isLoading: true, error: null };

/** Plan tersimpan sebuah Feature (P5a-1, AC-5.1); `plan` null bila Feature tidak punya Plan. */
export function useFeaturePlan(workspaceId: string | undefined, featureTaskId: string) {
  const [state, setState] = useState<FeaturePlanState>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!workspaceId) {
      setState({ plan: null, isLoading: false, error: null });
      return;
    }
    setState(INITIAL_STATE);
    void featurePlanService
      .getFeaturePlanForFeature(workspaceId, featureTaskId)
      .then((plan) => {
        if (requestId !== requestIdRef.current) return;
        setState({ plan, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          plan: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Plan tidak dapat dimuat.',
        });
      });
  }, [workspaceId, featureTaskId, reloadToken]);

  return { ...state, reload };
}
