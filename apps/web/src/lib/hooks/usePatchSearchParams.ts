import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Patches URL search params from the latest value, not the value of the last render.
 *
 * React Router's functional `setSearchParams` updater receives the params of the last render. Two
 * updates made before the router re-renders (e.g. typing in a search box and changing a status
 * filter right after) would therefore drop the first update. This hook keeps the params it last
 * wrote and builds every patch on top of them.
 */
export function usePatchSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const latest = useRef(searchParams);

  useLayoutEffect(() => {
    latest.current = searchParams;
  }, [searchParams]);

  const patchSearchParams = useCallback(
    (patch: (current: URLSearchParams) => URLSearchParams, replace = false) => {
      const next = patch(new URLSearchParams(latest.current));
      latest.current = next;
      setSearchParams(next, { replace });
    },
    [setSearchParams],
  );

  return [searchParams, patchSearchParams] as const;
}
