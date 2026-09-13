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

    expect(screen.getByRole('heading', { name: 'Yang perlu Anda perhatikan' })).toBeInTheDocument();
    expect(
      screen.getByText('Prioritas Developer ditentukan dari alur Workspace yang tersimpan.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pekerjaan yang Ditugaskan/ })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Masukan Review/ })).toHaveTextContent('0');
    expect(screen.getByRole('tab', { name: /Perbaikan Bug/ })).toHaveTextContent('1');
    expect(
      screen.getByText('Subtask frontend ini ditugaskan kepada Anda dan berstatus in progress.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Berikutnya: Lanjutkan Subtask')).toBeInTheDocument();
    expect(screen.queryByText('Total Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Selesai')).not.toBeInTheDocument();
  });

  it('opens an actionable task using the contract subject id', async () => {
    const onOpenQueueItem = vi.fn().mockResolvedValue(undefined);
    renderDashboard({ onOpenQueueItem });

    const openButton = screen.getByRole('button', {
      name: 'Buka Implement checkout summary. Tindakan berikutnya: Lanjutkan Subtask',
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
    fireEvent.change(screen.getByLabelText('Filter antrean kerja berdasarkan prioritas'), {
      target: { value: 'low' },
    });
    expect(screen.getByText('Tidak ada tindakan yang cocok')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter antrean kerja berdasarkan prioritas'), {
      target: { value: 'all' },
    });
    fireEvent.change(screen.getByLabelText('Cari antrean kerja'), {
      target: { value: 'missing phrase' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByText('Tidak ada tindakan yang cocok')).toBeInTheDocument();
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

    assertIllustration('Ilustrasi tidak ada pekerjaan Requirement');
    fireEvent.click(screen.getByRole('tab', { name: /Keputusan Rilis/ }));
    assertIllustration('Ilustrasi tidak ada keputusan rilis');
    fireEvent.click(screen.getByRole('tab', { name: /Pekerjaan Timeline/ }));
    assertIllustration('Ilustrasi tidak ada pekerjaan timeline');
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

    fireEvent.click(screen.getByRole('tab', { name: /Perbaikan Bug/ }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Buka Checkout total mismatch. Tindakan berikutnya: Mulai Perbaikan Bug',
      }),
    );

    const bugWorkspace = screen.getByLabelText('Pekerjaan Bug yang ditugaskan');
    expect(bugWorkspace).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(await screen.findByText('Pekerjaan Bug yang Ditugaskan')).toBeInTheDocument();
    expect(bugMocks.listBugs).toHaveBeenCalledWith(workQueueFixtureIds.workspace, {
      queue: 'assigned_work',
    });
  });

  it('shows loading, permission, and retryable error states', () => {
    const { rerender, props } = renderDashboard({
      queueState: { queue: null, isLoading: true, error: null, permissionDenied: false },
    });
    expect(screen.getByLabelText('Memuat antrean kerja sesuai peran')).toBeInTheDocument();

    rerender(
      <MyTasksDashboard
        {...props}
        queueState={{ queue: null, isLoading: false, error: null, permissionDenied: true }}
      />,
    );
    expect(screen.getByText('Akses antrean kerja ditolak')).toBeInTheDocument();

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
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(props.onRefreshQueue).toHaveBeenCalledOnce();
  });
});
