import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { RoleAwareWorkQueueViewState } from '../../../../lib/hooks/useRoleAwareWorkQueue';
import { MyTasksDashboard } from '../MyTasksDashboard';
import uiReducer from '../../../../store/uiSlice';
import {
  createRoleAwareWorkQueueFixture,
  workQueueFixtureIds,
} from '../../../../test/workQueueFixture';

const bugMocks = vi.hoisted(() => ({
  listBugs: vi.fn(),
  updateBug: vi.fn(),
}));

vi.mock('../../../../lib/api/bugService', () => ({
  bugService: bugMocks,
}));

function queueState(
  role: 'planner' | 'developer' | 'qa' = 'developer',
): RoleAwareWorkQueueViewState {
  return {
    queue: createRoleAwareWorkQueueFixture(role),
    isLoading: false,
    error: null,
    permissionDenied: false,
  };
}

function renderDashboard(overrides: Partial<React.ComponentProps<typeof MyTasksDashboard>> = {}) {
  const props: React.ComponentProps<typeof MyTasksDashboard> = {
    selectedTaskId: null,
    userRole: 'dev',
    queueState: queueState(),
    onRefreshQueue: vi.fn(),
    onOpenQueueItem: vi.fn(),
    onCreateTaskClick: vi.fn(),
    ...overrides,
  };
  return { ...render(<MyTasksDashboard {...props} />), props };
}

describe('MyTasksDashboard Organism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bugMocks.listBugs.mockResolvedValue([]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows backend-derived Developer priorities instead of generic task metrics', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'What needs your attention' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Developer priorities are derived by the backend from persisted Workspace workflow.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assigned work/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /Review feedback/ })).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /Bug fixes/ })).toHaveTextContent('1');
    expect(
      screen.getByText('This frontend subtask is assigned to you and is in progress.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Next: Continue Subtask')).toBeInTheDocument();
    expect(screen.queryByText('Total Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('opens an actionable task using the contract subject id', async () => {
    const onOpenQueueItem = vi.fn().mockResolvedValue(undefined);
    renderDashboard({ onOpenQueueItem });

    const openButton = screen.getByRole('button', {
      name: 'Open Implement checkout summary. Next action: Continue Subtask',
    });
    openButton.focus();
    fireEvent.keyDown(openButton, { key: 'Enter' });
    fireEvent.click(openButton);

    await waitFor(() =>
      expect(onOpenQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: workQueueFixtureIds.subtask }),
      ),
    );
    expect(openButton).toHaveFocus();
  });

  it('retains useful queue search and priority filters', async () => {
    vi.useFakeTimers();
    renderDashboard({
      userRole: 'po',
      queueState: queueState('planner'),
    });

    expect(screen.getByText('Checkout release')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter work queue by priority'), {
      target: { value: 'low' },
    });
    expect(screen.getByText('No matching actions')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter work queue by priority'), {
      target: { value: 'all' },
    });
    fireEvent.change(screen.getByLabelText('Search work queue'), {
      target: { value: 'missing phrase' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByText('No matching actions')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows the approved illustration for empty PO work buckets only', () => {
    const plannerQueue = createRoleAwareWorkQueueFixture('planner');
    const emptyPlannerQueue = {
      ...plannerQueue,
      buckets: plannerQueue.buckets.map((bucket) => ({ ...bucket, items: [], total: 0 })),
    };

    renderDashboard({
      userRole: 'po',
      queueState: {
        queue: emptyPlannerQueue,
        isLoading: false,
        error: null,
        permissionDenied: false,
      },
    });

    const assertIllustration = (name: string) => {
      const illustration = screen.getByRole('img', { name });
      expect(illustration).toHaveAttribute(
        'src',
        'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1788007862/ChatGPT_Image_Aug_18_2026_11_18_28_AM.png',
      );
    };

    assertIllustration('No requirement work illustration');
    fireEvent.click(screen.getByRole('button', { name: /Release decisions/ }));
    assertIllustration('No release decisions illustration');
    fireEvent.click(screen.getByRole('button', { name: /Timeline work/ }));
    assertIllustration('No timeline work illustration');
  });

  it('moves keyboard focus to the existing Bug action workspace', async () => {
    const store = configureStore({ reducer: { ui: uiReducer } });
    render(
      <Provider store={store}>
        <MyTasksDashboard
          selectedTaskId={null}
          userRole="dev"
          workspaceId={workQueueFixtureIds.workspace}
          queueState={queueState()}
          onRefreshQueue={vi.fn()}
          onOpenQueueItem={vi.fn()}
          onCreateTaskClick={vi.fn()}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Bug fixes/ }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open Checkout total mismatch. Next action: Start Bug Fix',
      }),
    );

    const bugWorkspace = screen.getByLabelText('Assigned Bug work actions');
    expect(bugWorkspace).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(await screen.findByText('Assigned Bug Work')).toBeInTheDocument();
    expect(bugMocks.listBugs).toHaveBeenCalledWith(workQueueFixtureIds.workspace, {
      queue: 'assigned_work',
    });
  });

  it('shows loading, permission, and retryable error states', () => {
    const { rerender, props } = renderDashboard({
      queueState: { queue: null, isLoading: true, error: null, permissionDenied: false },
    });
    expect(screen.getByLabelText('Loading role-aware work queue')).toBeInTheDocument();

    rerender(
      <MyTasksDashboard
        {...props}
        queueState={{ queue: null, isLoading: false, error: null, permissionDenied: true }}
      />,
    );
    expect(screen.getByText('Work queue access denied')).toBeInTheDocument();

    rerender(
      <MyTasksDashboard
        {...props}
        queueState={{
          queue: null,
          isLoading: false,
          error: 'Queue unavailable',
          permissionDenied: false,
        }}
      />,
    );
    expect(screen.getByText('Queue unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRefreshQueue).toHaveBeenCalledOnce();
  });
});
