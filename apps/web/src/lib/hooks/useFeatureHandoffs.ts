import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeatureHandoffItem } from '@qlick/contracts';
import { workQueueService } from '../api/workQueueService';

const PAGE_SIZE = 20;

export interface FeatureHandoffsState {
  items: FeatureHandoffItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

const INITIAL_STATE: FeatureHandoffsState = {
  items: [],
  total: 0,
  isLoading: true,
  isLoadingMore: false,
  error: null,
};

/** Riwayat serah-terima satu Feature (P4d, AC-4.5), terbaru di atas, dimuat per halaman. */
export function useFeatureHandoffs(workspaceId: string | undefined, featureTaskId: string) {
  const [state, setState] = useState<FeatureHandoffsState>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  const pageRef = useRef(1);
  const requestIdRef = useRef(0);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    pageRef.current = 1;
    if (!workspaceId) {
      setState({ ...INITIAL_STATE, isLoading: false });
      return;
    }
    setState(INITIAL_STATE);
    void workQueueService
      .getFeatureHandoffs(workspaceId, featureTaskId, 1, PAGE_SIZE)
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          items: page.items,
          total: page.total,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          ...INITIAL_STATE,
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Riwayat serah-terima tidak dapat dimuat.',
        });
      });
    return () => {
      requestIdRef.current += 1;
    };
  }, [workspaceId, featureTaskId, reloadToken]);

  const loadMore = useCallback(() => {
    if (!workspaceId) return;
    const requestId = requestIdRef.current;
    const nextPage = pageRef.current + 1;
    setState((current) => ({ ...current, isLoadingMore: true, error: null }));
    void workQueueService
      .getFeatureHandoffs(workspaceId, featureTaskId, nextPage, PAGE_SIZE)
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        pageRef.current = nextPage;
        setState((current) => ({
          items: [...current.items, ...page.items],
          total: page.total,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setState((current) => ({
          ...current,
          isLoadingMore: false,
          error:
            error instanceof Error ? error.message : 'Riwayat serah-terima tidak dapat dimuat.',
        }));
      });
  }, [workspaceId, featureTaskId]);

  return { state, reload, loadMore };
}
