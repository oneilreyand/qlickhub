import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1';

/** `live` = stream open; `reconnecting` = retrying; `polling` = no stream, periodic refresh. */
export type LeaderLiveStatus = 'connecting' | 'live' | 'reconnecting' | 'polling';

export const LEADER_LIVE_DEBOUNCE_MS = 2000;
export const LEADER_POLL_MS = 120_000;

/**
 * LEADER-PIPELINE-HUB P5: calls `onChange` when a Workspace the user leads changes. Uses one SSE
 * stream (`/v1/leader/stream`); bursts are debounced. Without EventSource, or while the stream is
 * down, it falls back to a refresh every 2 minutes while the tab is visible.
 */
export function useLeaderLiveUpdates(onChange: () => void, enabled = true): LeaderLiveStatus {
  const [status, setStatus] = useState<LeaderLiveStatus>('connecting');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return undefined;
    let source: EventSource | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    let closed = false;

    const fire = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => onChangeRef.current(), LEADER_LIVE_DEBOUNCE_MS);
    };
    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') {
          onChangeRef.current();
        }
      }, LEADER_POLL_MS);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    const connect = () => {
      if (closed) return;
      if (typeof EventSource === 'undefined') {
        setStatus('polling');
        startPolling();
        return;
      }
      source = new EventSource(`${API_BASE_URL}/leader/stream`, { withCredentials: true });
      source.addEventListener('leader:ready', () => {
        attempts = 0;
        stopPolling();
        setStatus('live');
      });
      source.addEventListener('leader:pipeline_changed', fire);
      source.onerror = () => {
        source?.close();
        source = null;
        attempts += 1;
        setStatus(attempts >= 3 ? 'polling' : 'reconnecting');
        startPolling();
        const delay = Math.min(60_000, 2000 * 2 ** attempts);
        retry = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closed = true;
      source?.close();
      if (debounce) clearTimeout(debounce);
      if (retry) clearTimeout(retry);
      stopPolling();
    };
  }, [enabled]);

  return status;
}
