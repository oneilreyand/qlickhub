import { act, render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DevWorkingDesk } from '../DevWorkingDesk';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task, TaskComment } from '@qlick/contracts';

const taskServiceMock = vi.hoisted(() => ({
  listTaskComments: vi.fn(),
}));

vi.mock('../../../../../lib/api/taskService', () => ({
  taskService: taskServiceMock,
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
};

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        activeWorkspaceId: 'ws-1',
        workspaces: [],
        members: [
          {
            id: 'm-1',
            workspaceId: 'ws-1',
            userId: 'u-1',
            role: 'po' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-1', name: 'Alice PO', email: 'alice@qlick.io' },
          },
          {
            id: 'm-2',
            workspaceId: 'ws-1',
            userId: 'u-2',
            role: 'dev' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-2', name: 'Bob Dev', email: 'bob@qlick.io' },
          },
        ],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });
};

const mockSubtask: Task = {
  id: 'st-dev-1',
  workspaceId: 'ws-1',
  parentTaskId: 't-parent-1',
  deliveryArea: 'frontend',
  title: 'Implement Navigation Bar Component',
  description:
    'Create responsive navigation with dark mode support.\n- **PR Link**: https://github.com/org/repo/pull/123\n- **Branch**: `feature/nav-bar`\n- **Staging URL**: https://staging.app.io/nav',
  status: 'in_progress',
  priority: 'medium',
  reporterId: 'u-1',
  assigneeId: 'u-2',
  startDate: '2026-08-01',
  dueDate: '2026-08-25',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockParent: Task = {
  id: 't-parent-1',
  workspaceId: 'ws-1',
  title: 'Global App Shell',
  description: 'PRD: Must include header, sidebar, and theme toggle.',
  status: 'in_progress',
  priority: 'high',
  reporterId: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('DevWorkingDesk Organism', () => {
  beforeEach(() => {
    taskServiceMock.listTaskComments.mockReset();
    taskServiceMock.listTaskComments.mockResolvedValue({
      comments: [],
      total: 0,
      page: 1,
      limit: 50,
    });
  });

  it('renders developer workstation with workflow stepper, schedule timeline, and separated PO vs Dev notes', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DevWorkingDesk
          subtask={mockSubtask}
          parentTask={mockParent}
          workspaceId="ws-1"
          currentUserId="u-2"
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    // Header & Roles
    expect(screen.getByText('Area Kerja Frontend')).toBeInTheDocument();
    expect(screen.getByText('Implement Navigation Bar Component')).toBeInTheDocument();
    expect(screen.getByText('Global App Shell')).toBeInTheDocument();
    expect(screen.getByText('Serahkan ke QA')).toBeInTheDocument();
    expect(screen.getByText('Developer yang Ditugaskan')).toBeInTheDocument();
    expect(screen.getByText('Bob Dev')).toBeInTheDocument();
    expect(screen.getByText('Alice PO')).toBeInTheDocument();

    // Schedule Timeline
    expect(screen.getByText('Timeline & Status Komitmen')).toBeInTheDocument();
    expect(screen.getByText(/Mulai: 2026-08-01/i)).toBeInTheDocument();
    expect(screen.getByText(/Tenggat: 2026-08-25/i)).toBeInTheDocument();

    // PO Brief (read-only)
    expect(screen.getByText('Ringkasan Produk & Spesifikasi dari PO')).toBeInTheDocument();
    expect(
      screen.getByText(/PRD: Must include header, sidebar, and theme toggle/i),
    ).toBeInTheDocument();

    // Dev Deliverables inputs pre-populated from description
    const prInput = screen.getByDisplayValue('https://github.com/org/repo/pull/123');
    expect(prInput).toBeInTheDocument();
    const branchInput = screen.getByDisplayValue('feature/nav-bar');
    expect(branchInput).toBeInTheDocument();
    const stagingInput = screen.getByDisplayValue('https://staging.app.io/nav');
    expect(stagingInput).toBeInTheDocument();

    // Dev implementation notes textarea
    expect(
      screen.getByDisplayValue(/Create responsive navigation with dark mode support/i),
    ).toBeInTheDocument();

    // 2-Tab Navigation
    expect(screen.getByText('Pekerjaan & Hasil')).toBeInTheDocument();
    const discussionTab = screen.getByText('Diskusi Tim');
    expect(discussionTab).toBeInTheDocument();

    // Switch to Team Discussion tab
    fireEvent.click(discussionTab);
    expect(screen.getByText(/Diskusi Kolaborasi Subtask/i)).toBeInTheDocument();
  });

  it('opens Serahkan ke QA modal when clicking Serahkan ke QA button', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DevWorkingDesk
          subtask={mockSubtask}
          parentTask={mockParent}
          workspaceId="ws-1"
          currentUserId="u-2"
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const handoffBtn = screen.getByText('Serahkan ke QA');
    fireEvent.click(handoffBtn);

    expect(screen.getByText('Serahkan Handoff kepada Tim QA')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Contoh: masuk dengan test-qa@qlick.io/i),
    ).toBeInTheDocument();
  });

  it('ignores comments loaded for a previous subtask after switching tasks', async () => {
    const firstRequest = deferred<{ comments: TaskComment[] }>();
    const secondRequest = deferred<{ comments: TaskComment[] }>();
    taskServiceMock.listTaskComments
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const previousComment: TaskComment = {
      id: 'comment-previous',
      workspaceId: 'ws-1',
      taskId: mockSubtask.id,
      authorId: 'u-1',
      authorName: 'Alice PO',
      parentCommentId: null,
      body: 'Comment from the previous subtask',
      editedAt: null,
      deletedAt: null,
      createdAt: '2026-09-11T01:00:00.000Z',
      updatedAt: '2026-09-11T01:00:00.000Z',
      mentions: [],
    };
    const currentComment: TaskComment = {
      ...previousComment,
      id: 'comment-current',
      taskId: 'st-dev-2',
      body: 'Comment from the current subtask',
    };
    const currentSubtask = { ...mockSubtask, id: 'st-dev-2', title: 'Current subtask' };
    const store = createTestStore();
    const view = render(
      <Provider store={store}>
        <DevWorkingDesk
          subtask={mockSubtask}
          parentTask={mockParent}
          workspaceId="ws-1"
          currentUserId="u-2"
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    view.rerender(
      <Provider store={store}>
        <DevWorkingDesk
          subtask={currentSubtask}
          parentTask={mockParent}
          workspaceId="ws-1"
          currentUserId="u-2"
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    await act(async () => {
      secondRequest.resolve({ comments: [currentComment] });
      await secondRequest.promise;
    });
    fireEvent.click(screen.getByText('Diskusi Tim'));
    expect(screen.getByText(currentComment.body)).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve({ comments: [previousComment] });
      await firstRequest.promise;
    });

    expect(screen.getByText(currentComment.body)).toBeInTheDocument();
    expect(screen.queryByText(previousComment.body)).not.toBeInTheDocument();
  });
});
