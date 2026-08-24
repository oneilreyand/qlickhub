import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MyTaskDetailWorkspaceDrawer } from '../MyTaskDetailWorkspaceDrawer';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';
import { createDeliveryTraceFixture } from '../../../../../test/deliveryTraceFixture';

const { getParentTaskDeliveryTraceMock, getTaskTestExecutionsMock } = vi.hoisted(() => ({
  getParentTaskDeliveryTraceMock: vi.fn(),
  getTaskTestExecutionsMock: vi.fn(),
}));

vi.mock('../../../../../lib/api/traceabilityService', () => ({
  traceabilityService: {
    getParentTaskDeliveryTrace: (...args: unknown[]) => getParentTaskDeliveryTraceMock(...args),
  },
}));

vi.mock('../../../../../lib/api/testManagementService', () => ({
  testManagementService: {
    getTaskTestExecutions: (...args: unknown[]) => getTaskTestExecutionsMock(...args),
    createTestRun: vi.fn(),
    recordTestResult: vi.fn(),
  },
}));

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
        workspaces: [
          {
            id: 'ws-1',
            name: 'Workspace Alpha',
            slug: 'ws-alpha',
            role: 'po' as const,
            ownerId: 'u-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        members: [
          {
            id: 'm-1',
            workspaceId: 'ws-1',
            userId: 'u-1',
            role: 'po' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-1', name: 'Alice PO', email: 'alice@qlick.io' },
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

const mockTask: Task = {
  id: 't-100',
  workspaceId: 'ws-1',
  title: 'Payment Integration Milestone',
  description: 'Support multi-gateway transactions with Stripe & PayPal.',
  status: 'in_progress',
  priority: 'urgent',
  reporterId: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subtasks: [],
};

const mockSubtask: Task = {
  id: 'subtask-200',
  workspaceId: 'ws-1',
  parentTaskId: 'parent-100',
  deliveryArea: 'frontend',
  title: 'Implement payment selector',
  description: 'Persisted developer work.',
  status: 'in_progress',
  priority: 'high',
  reporterId: 'u-1',
  assigneeId: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createSubtaskTrace() {
  const trace = createDeliveryTraceFixture();
  return {
    ...trace,
    workspaceId: mockSubtask.workspaceId,
    requestedTaskId: mockSubtask.id,
    featureTask: {
      ...trace.featureTask,
      id: mockSubtask.parentTaskId!,
      workspaceId: mockSubtask.workspaceId,
      title: 'Payment Selection Feature',
      description: 'Customers can select a persisted payment method.',
    },
    featureSubtasks: [mockSubtask],
    requirements: trace.requirements.map((node) => ({
      ...node,
      requirement: { ...node.requirement, workspaceId: mockSubtask.workspaceId },
      implementingSubtasks: [mockSubtask],
    })),
  };
}

describe('MyTaskDetailWorkspaceDrawer Organism', () => {
  beforeEach(() => {
    getParentTaskDeliveryTraceMock.mockReset();
    getTaskTestExecutionsMock.mockReset();
    getTaskTestExecutionsMock.mockImplementation((workspaceId: string, taskId: string) =>
      Promise.resolve({
        workspaceId,
        requestedTaskId: taskId,
        featureTaskId: taskId,
        executions: [],
      }),
    );
  });

  it('renders drawer with role switcher tabs (PO Cockpit, Dev Workstation, QA Testing Desk)', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MyTaskDetailWorkspaceDrawer
          task={mockTask}
          userRole="po"
          isOpen={true}
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(screen.getByText('PO Cockpit & iCards')).toBeInTheDocument();
    expect(screen.getByText('Dev Working Desk')).toBeInTheDocument();
    expect(screen.getByText('QA Testing Desk')).toBeInTheDocument();
    expect(screen.getByText('Role: po')).toBeInTheDocument();
    expect(screen.getByText('PO Management Cockpit')).toBeInTheDocument();

    const drawerToolbar = screen.getByRole('toolbar', {
      name: 'Payment Integration Milestone navigation and controls',
    });
    expect(drawerToolbar).toContainElement(
      screen.getByRole('button', { name: 'PO Cockpit & iCards' }),
    );
    expect(drawerToolbar).toContainElement(
      screen.getByRole('button', { name: 'Restore normal view' }),
    );
    expect(drawerToolbar).toContainElement(screen.getByRole('button', { name: 'Close drawer' }));

    const drawerContent = screen.getByRole('region', {
      name: 'Payment Integration Milestone content',
    });
    expect(drawerContent.closest('.fixed.inset-0')).toHaveClass('z-20');
  });

  it('switches views smoothly when clicking persona tabs', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MyTaskDetailWorkspaceDrawer
          task={mockTask}
          userRole="po"
          isOpen={true}
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    const devTab = screen.getByText('Dev Working Desk');
    fireEvent.click(devTab);
    expect(
      screen.getByText(/Dev Deliverables & Technical Implementation Notes/i),
    ).toBeInTheDocument();

    const qaTab = screen.getByText('QA Testing Desk');
    fireEvent.click(qaTab);
    expect(screen.getByText(/Canonical Test Management & Executions/i)).toBeInTheDocument();
  });

  it('loads persisted parent context for an assigned subtask and keeps it across persona navigation', async () => {
    getParentTaskDeliveryTraceMock.mockResolvedValue(createSubtaskTrace());
    const store = createTestStore();

    render(
      <Provider store={store}>
        <MyTaskDetailWorkspaceDrawer
          task={mockSubtask}
          userRole="po"
          isOpen
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(screen.getByLabelText('Loading Feature context')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Payment Selection Feature' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Review checkout before confirmation')).toBeInTheDocument();
    expect(
      screen.getByText('Order and payment details are visible before confirmation.'),
    ).toBeInTheDocument();
    expect(getParentTaskDeliveryTraceMock).toHaveBeenCalledWith('ws-1', mockSubtask.id);

    fireEvent.click(screen.getByText('QA Testing Desk'));
    expect(await screen.findByText('Canonical Test Management & Executions')).toBeInTheDocument();
    expect(await screen.findByText('No Test Cases linked to this Feature')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payment Selection Feature' })).toBeInTheDocument();
    expect(screen.getByLabelText('Feature context breadcrumb')).toHaveTextContent(
      'Implement payment selector',
    );
  });

  it('reloads the backend-supplied Feature context after the drawer is mounted again', async () => {
    getParentTaskDeliveryTraceMock.mockResolvedValue(createSubtaskTrace());
    const firstStore = createTestStore();
    const firstRender = render(
      <Provider store={firstStore}>
        <MyTaskDetailWorkspaceDrawer
          task={mockSubtask}
          userRole="dev"
          isOpen
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Payment Selection Feature' }),
    ).toBeInTheDocument();
    firstRender.unmount();

    const refreshedStore = createTestStore();
    render(
      <Provider store={refreshedStore}>
        <MyTaskDetailWorkspaceDrawer
          task={{ ...mockSubtask }}
          userRole="dev"
          isOpen
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Payment Selection Feature' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(getParentTaskDeliveryTraceMock).toHaveBeenCalledTimes(2));
  });

  it('maps recoverable and forbidden context failures to explicit drawer states', async () => {
    getParentTaskDeliveryTraceMock
      .mockRejectedValueOnce(new Error('Temporary context failure'))
      .mockResolvedValueOnce(createSubtaskTrace());
    const store = createTestStore();

    const firstRender = render(
      <Provider store={store}>
        <MyTaskDetailWorkspaceDrawer
          task={mockSubtask}
          userRole="dev"
          isOpen
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(await screen.findByText('Feature context unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading Feature context' }));
    expect(
      await screen.findByRole('heading', { name: 'Payment Selection Feature' }),
    ).toBeInTheDocument();
    firstRender.unmount();

    getParentTaskDeliveryTraceMock.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    );
    const forbiddenStore = createTestStore();
    render(
      <Provider store={forbiddenStore}>
        <MyTaskDetailWorkspaceDrawer
          task={mockSubtask}
          userRole="dev"
          isOpen
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(await screen.findByText('Feature context access restricted')).toBeInTheDocument();
    expect(screen.queryByText('Payment Selection Feature')).not.toBeInTheDocument();
  });
});
