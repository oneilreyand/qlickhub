import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoleAwareWorkQueue } from '@qlick/contracts';
import { workQueueService } from '../api/workQueueService';

export interface RoleAwareWorkQueueViewState {
  queue: RoleAwareWorkQueue | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

const EMPTY_STATE: RoleAwareWorkQueueViewState = {
  queue: null,
  isLoading: false,
  error: null,
  permissionDenied: false,
};

export function useRoleAwareWorkQueue(workspaceId: string | undefined) {
  const [state, setState] = useState<RoleAwareWorkQueueViewState>(EMPTY_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!workspaceId) {
      setState(EMPTY_STATE);
      return;
    }

    setState({ queue: null, isLoading: true, error: null, permissionDenied: false });
    void workQueueService
      .getRoleAwareQueue(workspaceId)
      .then((queue) => {
        if (requestId !== requestIdRef.current) return;
        setState({ queue, isLoading: false, error: null, permissionDenied: false });
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number(error.status)
            : undefined;
        setState({
          queue: null,
          isLoading: false,
          error:
            status === 403
              ? null
              : error instanceof Error
                ? error.message
                : 'Unable to load your work queue.',
          permissionDenied: status === 403,
        });
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [reloadToken, workspaceId]);

  return { state, reload };
}
