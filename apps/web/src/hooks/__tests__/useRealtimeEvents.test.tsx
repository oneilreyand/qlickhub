import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeEvents, realtimeManager } from '../useRealtimeEvents';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../../store/uiSlice';
import React from 'react';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, ((event: any) => void)[]> = {};
  url: string;
  options: any;

  constructor(url: string, options: any) {
    this.url = url;
    this.options = options;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, callback: (event: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb({ data: JSON.stringify({ data }) }));
    }
  }

  close() {
    this.listeners = {};
  }
}

describe('useRealtimeEvents Hook', () => {
  let originalEventSource: any;
  let store: any;

  beforeEach(() => {
    realtimeManager.disconnect();
    MockEventSource.instances = [];
    originalEventSource = (global as any).EventSource;
    (global as any).EventSource = MockEventSource;

    store = configureStore({
      reducer: {
        ui: uiReducer,
      },
    });
  });

  afterEach(() => {
    realtimeManager.disconnect();
    (global as any).EventSource = originalEventSource;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  it('subscribes to SSE stream and handles realtime discussion comment creation', () => {
    const onCommentCreated = vi.fn();

    renderHook(
      () =>
        useRealtimeEvents({
          workspaceId: 'ws-123',
          onCommentCreated,
        }),
      { wrapper }
    );

    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toContain('/workspaces/ws-123/realtime-stream');

    // Simulate incoming discussion comment event
    const mockPayload = {
      taskId: 'task-1',
      comment: { id: 'c-1', body: 'New discussion comment', authorId: 'u-1' },
      authorId: 'u-1',
      mentionedUserIds: ['u-2'],
    };

    act(() => {
      MockEventSource.instances[0].emit('discussion:comment_created', mockPayload);
    });

    expect(onCommentCreated).toHaveBeenCalledWith(mockPayload);
  });

  it('handles realtime notification:new and updates Redux state immediately', () => {
    const onNotificationReceived = vi.fn();

    renderHook(
      () =>
        useRealtimeEvents({
          workspaceId: 'ws-123',
          onNotificationReceived,
          enableToast: false,
        }),
      { wrapper }
    );

    const mockNotification = {
      id: 'notif-99',
      userId: 'user-indra',
      workspaceId: 'ws-123',
      type: 'mention',
      title: '📢 @channel: Feature Payment',
      message: 'Fajar mentioned you',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    act(() => {
      MockEventSource.instances[0].emit('notification:new', mockNotification);
    });

    expect(onNotificationReceived).toHaveBeenCalledWith(mockNotification);

    // Verify Redux state updated in real-time
    const state = store.getState();
    expect(state.ui.unreadNotificationCount).toBe(1);
    expect(state.ui.inAppNotifications.length).toBe(1);
    expect(state.ui.inAppNotifications[0].id).toBe('notif-99');
  });

  it('multiplexes multiple subtask components on a single EventSource connection', () => {
    const subtask1Callback = vi.fn();
    const subtask2Callback = vi.fn();
    const subtask3Callback = vi.fn();

    // Mount 3 subtask listeners simultaneously in the same workspace
    renderHook(() => useRealtimeEvents({ workspaceId: 'ws-123', onCommentCreated: subtask1Callback }), { wrapper });
    renderHook(() => useRealtimeEvents({ workspaceId: 'ws-123', onCommentCreated: subtask2Callback }), { wrapper });
    renderHook(() => useRealtimeEvents({ workspaceId: 'ws-123', onCommentCreated: subtask3Callback }), { wrapper });

    // Assert only 1 EventSource was instantiated (avoiding HTTP connection limit)
    expect(MockEventSource.instances.length).toBe(1);

    const subtask1Payload = {
      taskId: 'subtask-1',
      comment: { id: 'c-sub1', body: 'Subtask 1 discussion', authorId: 'u-fe' },
      authorId: 'u-fe',
      mentionedUserIds: [],
    };

    act(() => {
      MockEventSource.instances[0].emit('discussion:comment_created', subtask1Payload);
    });

    expect(subtask1Callback).toHaveBeenCalledWith(subtask1Payload);
    expect(subtask2Callback).toHaveBeenCalledWith(subtask1Payload);
    expect(subtask3Callback).toHaveBeenCalledWith(subtask1Payload);
  });
});
