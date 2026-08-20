import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { receiveRealtimeNotification, enqueueSnackbar } from '../store/uiSlice';
import { InAppNotification, TaskComment } from '@qlick/contracts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';

export interface RealtimeCommentCreatedPayload {
  taskId: string;
  comment: TaskComment;
  authorId: string;
  mentionedUserIds: string[];
  isChannel?: boolean;
}

export interface RealtimeCommentUpdatedPayload {
  taskId: string;
  comment: TaskComment;
}

export interface RealtimeCommentDeletedPayload {
  taskId: string;
  commentId: string;
}

export interface UseRealtimeEventsOptions {
  workspaceId?: string;
  onCommentCreated?: (payload: RealtimeCommentCreatedPayload) => void;
  onCommentUpdated?: (payload: RealtimeCommentUpdatedPayload) => void;
  onCommentDeleted?: (payload: RealtimeCommentDeletedPayload) => void;
  onNotificationReceived?: (notification: InAppNotification) => void;
  enableToast?: boolean;
}

interface Subscriber {
  id: string;
  workspaceId: string;
  getOptions: () => UseRealtimeEventsOptions;
  dispatch: ReturnType<typeof useAppDispatch>;
}

/**
 * Singleton connection manager that multiplexes all workspace SSE subscriptions
 * over a single persistent EventSource connection.
 */
class RealtimeConnectionManager {
  private activeWorkspaceId: string | null = null;
  private eventSource: EventSource | null = null;
  private subscribers = new Map<string, Subscriber>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private disconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private nextSubId = 1;

  public subscribe(
    workspaceId: string,
    getOptions: () => UseRealtimeEventsOptions,
    dispatch: ReturnType<typeof useAppDispatch>
  ): () => void {
    const id = `sub_${this.nextSubId++}`;
    const subscriber: Subscriber = { id, workspaceId, getOptions, dispatch };
    this.subscribers.set(id, subscriber);

    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    if (this.activeWorkspaceId !== workspaceId) {
      this.activeWorkspaceId = workspaceId;
      this.reconnectAttempts = 0;
      this.connect(workspaceId);
    } else if (!this.eventSource) {
      this.connect(workspaceId);
    }

    return () => {
      this.subscribers.delete(id);
      this.checkSubscribers();
    };
  }

  private checkSubscribers() {
    const activeForWorkspace = Array.from(this.subscribers.values()).filter(
      (s) => s.workspaceId === this.activeWorkspaceId
    );

    if (activeForWorkspace.length === 0) {
      if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = setTimeout(() => {
        this.disconnect();
      }, 1000);
    }
  }

  private connect(workspaceId: string) {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      const streamUrl = `${API_BASE_URL}/workspaces/${workspaceId}/realtime-stream`;
      const es = new EventSource(streamUrl, { withCredentials: true });
      this.eventSource = es;

      es.addEventListener('notification:new', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          const notification = parsed.data as InAppNotification;
          if (notification && notification.id) {
            let toastDispatched = false;
            this.subscribers.forEach((sub) => {
              if (sub.workspaceId !== workspaceId) return;
              const opts = sub.getOptions();
              sub.dispatch(receiveRealtimeNotification(notification));
              if (opts.onNotificationReceived) {
                opts.onNotificationReceived(notification);
              }
              if (opts.enableToast && !toastDispatched) {
                if (notification.type === 'mention') {
                  sub.dispatch(enqueueSnackbar(`📢 ${notification.title}: ${notification.message}`, 'info'));
                  toastDispatched = true;
                } else if (notification.type === 'discussion') {
                  sub.dispatch(enqueueSnackbar(`💬 ${notification.title}: ${notification.message}`, 'info'));
                  toastDispatched = true;
                }
              }
            });
          }
        } catch {
          // Ignore parse errors on malformed payloads
        }
      });

      es.addEventListener('discussion:comment_created', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          const payload = parsed.data as RealtimeCommentCreatedPayload;
          if (payload) {
            this.subscribers.forEach((sub) => {
              if (sub.workspaceId === workspaceId) {
                const opts = sub.getOptions();
                if (opts.onCommentCreated) {
                  opts.onCommentCreated(payload);
                }
              }
            });
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('discussion:comment_updated', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          const payload = parsed.data as RealtimeCommentUpdatedPayload;
          if (payload) {
            this.subscribers.forEach((sub) => {
              if (sub.workspaceId === workspaceId) {
                const opts = sub.getOptions();
                if (opts.onCommentUpdated) {
                  opts.onCommentUpdated(payload);
                }
              }
            });
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('discussion:comment_deleted', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          const payload = parsed.data as RealtimeCommentDeletedPayload;
          if (payload) {
            this.subscribers.forEach((sub) => {
              if (sub.workspaceId === workspaceId) {
                const opts = sub.getOptions();
                if (opts.onCommentDeleted) {
                  opts.onCommentDeleted(payload);
                }
              }
            });
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.onopen = () => {
        this.reconnectAttempts = 0;
      };

      es.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        const delay = Math.min(15000, 2000 * Math.pow(1.5, this.reconnectAttempts));
        this.reconnectAttempts++;
        this.reconnectTimeout = setTimeout(() => {
          if (this.activeWorkspaceId && this.subscribers.size > 0) {
            this.connect(this.activeWorkspaceId);
          }
        }, delay);
      };
    } catch {
      this.reconnectTimeout = setTimeout(() => {
        if (this.activeWorkspaceId && this.subscribers.size > 0) {
          this.connect(this.activeWorkspaceId);
        }
      }, 5000);
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    this.activeWorkspaceId = null;
    this.subscribers.clear();
  }
}

export const realtimeManager = new RealtimeConnectionManager();

/**
 * Custom React hook for establishing and managing a persistent Server-Sent Events (SSE) stream
 * for real-time task discussions, unread badges, and instant mention notifications.
 * Uses a singleton manager so all components share a single EventSource connection.
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const { workspaceId } = options;
  const dispatch = useAppDispatch();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!workspaceId) return;

    const unsubscribe = realtimeManager.subscribe(workspaceId, () => optionsRef.current, dispatch);

    return () => {
      unsubscribe();
    };
  }, [workspaceId, dispatch]);
}
