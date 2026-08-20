import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SubtaskList } from '../SubtaskList';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';


import { realtimeManager } from '../../../../hooks/useRealtimeEvents';

// Mock EventSource for realtime tests
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

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    listTaskComments: vi.fn().mockResolvedValue({ comments: [], total: 0, page: 1, limit: 50 }),
    createTaskComment: vi.fn(),
    deleteTaskComment: vi.fn(),
    updateTask: vi.fn(),
    completeTask: vi.fn(),
  },
}));

const mockSubtasks: Task[] = [
  {
    id: 'sub-fe-1',
    workspaceId: 'ws-1',
    parentTaskId: 'parent-1',
    deliveryArea: 'frontend',
    title: 'Build Subtask Accordion UI',
    description: 'Implement Accordion molecule with smooth slide down.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user-fe',
    reporterId: 'user-po',
    startDate: null,
    dueDate: '2026-08-25',
    completedAt: null,
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
  },
  {
    id: 'sub-be-1',
    workspaceId: 'ws-1',
    parentTaskId: 'parent-1',
    deliveryArea: 'backend',
    title: 'Verify Subtask Attachment APIs',
    description: 'Ensure workspace permissions and attachments work.',
    status: 'done',
    priority: 'medium',
    assigneeId: 'user-be',
    reporterId: 'user-po',
    startDate: null,
    dueDate: '2026-08-22',
    completedAt: '2026-08-19T10:00:00.000Z',
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
  },
  {
    id: 'sub-qa-1',
    workspaceId: 'ws-1',
    parentTaskId: 'parent-1',
    deliveryArea: 'qa',
    title: 'QA Test Subtask Accordion',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigneeId: 'user-qa',
    reporterId: 'user-po',
    startDate: null,
    dueDate: null,
    completedAt: null,
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
  },
];

const mockMembers = [
  { userId: 'user-fe', role: 'dev', user: { name: 'Frontend Dev', email: 'fe@qa.com' } },
  { userId: 'user-be', role: 'dev', user: { name: 'Backend Dev', email: 'be@qa.com' } },
  { userId: 'user-qa', role: 'qa', user: { name: 'QA Engineer', email: 'qa@qa.com' } },
];

function renderWithStore(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('SubtaskList Organism Component', () => {
  let originalEventSource: any;

  beforeEach(() => {
    realtimeManager.disconnect();
    MockEventSource.instances = [];
    originalEventSource = (global as any).EventSource;
    (global as any).EventSource = MockEventSource;
  });

  afterEach(() => {
    realtimeManager.disconnect();
    (global as any).EventSource = originalEventSource;
  });

  it('renders subtask metrics header and summary counts', () => {
    renderWithStore(
      <SubtaskList
        subtasks={mockSubtasks}
        workspaceId="ws-1"
        members={mockMembers}
        canPlan={true}
      />
    );

    expect(screen.getByText(/Direct Subtasks \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1\/3 Done/i)).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getAllByText('QA').length).toBeGreaterThan(0);
  });

  it('filters subtasks by delivery area when clicking area filter chips', () => {
    renderWithStore(
      <SubtaskList
        subtasks={mockSubtasks}
        workspaceId="ws-1"
        members={mockMembers}
      />
    );

    expect(screen.getByText('Build Subtask Accordion UI')).toBeInTheDocument();
    expect(screen.getByText('Verify Subtask Attachment APIs')).toBeInTheDocument();
    expect(screen.getByText('QA Test Subtask Accordion')).toBeInTheDocument();

    // Click FE filter button
    const feFilterBtn = screen.getByRole('button', { name: /^FE \(1\)$/ });
    expect(feFilterBtn).toBeInTheDocument();
    fireEvent.click(feFilterBtn);

    expect(screen.getByText('Build Subtask Accordion UI')).toBeInTheDocument();
    expect(screen.queryByText('Verify Subtask Attachment APIs')).not.toBeInTheDocument();
    expect(screen.queryByText('QA Test Subtask Accordion')).not.toBeInTheDocument();
  });

  it('renders empty state illustration and CTA when subtasks array is empty', () => {
    const onOpenCreateModal = vi.fn();
    renderWithStore(
      <SubtaskList
        subtasks={[]}
        workspaceId="ws-1"
        canPlan={true}
        onOpenCreateModal={onOpenCreateModal}
      />
    );

    expect(screen.getByText(/No subtasks created under this task/i)).toBeInTheDocument();
    const planBtn = screen.getByRole('button', { name: /Plan First Subtask/i });
    expect(planBtn).toBeInTheDocument();

    fireEvent.click(planBtn);
    expect(onOpenCreateModal).toHaveBeenCalledTimes(1);
  });

  it('expands accordion item when clicking subtask row and reveals inner workspace', async () => {
    renderWithStore(
      <SubtaskList
        subtasks={mockSubtasks}
        workspaceId="ws-1"
        members={mockMembers}
      />
    );

    const subtaskTitle = screen.getByText('Build Subtask Accordion UI');
    const trigger = subtaskTitle.closest('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    if (trigger) {
      fireEvent.click(trigger);
    }
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Inner tabs should now be rendered (Description, Discussion, Details)
    expect(await screen.findByRole('button', { name: /^description$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^discussion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^details$/i })).toBeInTheDocument();
  });

  it('displays real-time unread discussion badge on subtask row when message arrives from another member', async () => {
    renderWithStore(
      <SubtaskList
        subtasks={mockSubtasks}
        workspaceId="ws-1"
        currentUserId="user-fe"
        members={mockMembers}
      />
    );

    // Initial state: no unread badge
    expect(screen.queryByText(/Baru/i)).not.toBeInTheDocument();

    // Verify SSE was established
    expect(MockEventSource.instances.length).toBe(1);

    // Another user ('user-qa') posts a comment on 'sub-fe-1'
    const newCommentPayload = {
      taskId: 'sub-fe-1',
      comment: {
        id: 'comm-live-1',
        taskId: 'sub-fe-1',
        authorId: 'user-qa',
        body: 'Halo Mas Budi, mohon cek API endpoint response nya ya.',
        createdAt: new Date().toISOString(),
      },
      authorId: 'user-qa',
      mentionedUserIds: [],
    };

    // Simulate incoming SSE event
    act(() => {
      MockEventSource.instances[0].emit('discussion:comment_created', newCommentPayload);
    });

    // The subtask row should now display the animated unread badge: "+1 Baru"
    expect(await screen.findByText(/\+1 Baru/i)).toBeInTheDocument();
  });
});
