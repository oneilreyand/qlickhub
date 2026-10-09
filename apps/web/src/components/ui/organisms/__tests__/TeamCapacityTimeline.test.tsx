import { render as baseRender, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TeamCapacityTimeline } from '../TeamCapacityTimeline';
import { capacityService } from '../../../../lib/api/capacityService';
import { taskService } from '../../../../lib/api/taskService';
import type { Task, TeamCapacityTimelineResponse } from '@qlick/contracts';

// The task detail links are router links, so the component needs a router context.
const render = (ui: React.ReactElement) => baseRender(<MemoryRouter>{ui}</MemoryRouter>);

vi.mock('../../../../lib/api/capacityService', () => ({
  capacityService: {
    getTeamTimeline: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    getTask: vi.fn(),
  },
}));

const mockTaskDetail = {
  id: 'sub-1',
  workspaceId: 'ws-1',
  title: 'FE UI Component',
  description: 'Membuat komponen UI yang dapat digunakan ulang.',
  deliveryArea: 'frontend',
  status: 'in_progress',
  priority: 'medium',
  reporterId: 'reporter-1',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as Task;

const mockTimelineData: TeamCapacityTimelineResponse = {
  workspaceId: 'ws-1',
  startDate: '2026-09-01',
  endDate: '2026-09-15',
  scope: 'workspace',
  totalMembers: 1,
  totalScheduledSubtasks: 2,
  totalUnscheduledSubtasks: 1,
  totalOutsideWindowSubtasks: 1,
  members: [
    {
      userId: 'dev-1',
      name: 'Developer Satu',
      email: 'dev1@example.com',
      role: 'dev',
      specialties: ['frontend'],
      conflictCount: 1,
      outsideWindowSubtaskCount: 1,
      scheduledSubtasks: [
        {
          id: 'sub-1',
          title: 'FE UI Component',
          deliveryArea: 'frontend',
          status: 'in_progress',
          priority: 'medium',
          startDate: '2026-09-02',
          dueDate: '2026-09-06',
          isRedacted: false,
          isCurrentWorkspace: true,
          workspaceId: 'ws-1',
        },
        {
          id: 'sub-2',
          title: 'Pekerjaan Aktif Lain',
          deliveryArea: 'backend',
          status: 'todo',
          priority: 'medium',
          startDate: '2026-09-05',
          dueDate: '2026-09-10',
          isRedacted: true,
          isCurrentWorkspace: false,
          workspaceId: 'ws-2',
        },
      ],
      unscheduledSubtasks: [
        {
          id: 'sub-un-1',
          title: 'FE Unscheduled Refactor',
          deliveryArea: 'frontend',
          status: 'todo',
          priority: 'low',
          startDate: null,
          dueDate: null,
          isRedacted: false,
          isCurrentWorkspace: true,
          workspaceId: 'ws-1',
        },
      ],
    },
  ],
};

describe('TeamCapacityTimeline Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(taskService.getTask).mockResolvedValue(mockTaskDetail);
  });

  test('fetches and renders team timeline with members and subtask bars', async () => {
    vi.mocked(capacityService.getTeamTimeline).mockResolvedValue(mockTimelineData);

    render(
      <TeamCapacityTimeline
        workspaceId="ws-1"
        initialStartDate="2026-09-01"
        initialEndDate="2026-09-15"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Timeline Kapasitas Tim' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Developer Satu')).toBeInTheDocument();
      expect(screen.getByText('FE UI Component')).toBeInTheDocument();
      expect(screen.getByText('Pekerjaan Aktif Lain')).toBeInTheDocument();
    });

    expect(screen.getByText('2 terjadwal')).toBeInTheDocument();
    expect(screen.getByText('1 tanpa jadwal')).toBeInTheDocument();
    expect(screen.getByText('1 di luar rentang')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pilih rentang tanggal' })).toBeInTheDocument();
    expect(screen.queryByText('Rentang Waktu:')).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(5);
  });

  test('expands unscheduled subtasks when clicking unscheduled chip', async () => {
    vi.mocked(capacityService.getTeamTimeline).mockResolvedValue(mockTimelineData);

    render(
      <TeamCapacityTimeline
        workspaceId="ws-1"
        initialStartDate="2026-09-01"
        initialEndDate="2026-09-15"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('1 tanpa jadwal')).toBeInTheDocument();
    });

    // Click unscheduled toggle
    fireEvent.click(screen.getByText('1 tanpa jadwal'));

    await waitFor(() => {
      expect(screen.getByText('FE Unscheduled Refactor')).toBeInTheDocument();
      expect(screen.getByText(/Beban Aktif Tanpa Jadwal \(1\):/)).toBeInTheDocument();
    });
  });

  test('clicking a subtask bar opens detail modal', async () => {
    vi.mocked(capacityService.getTeamTimeline).mockResolvedValue(mockTimelineData);

    render(
      <TeamCapacityTimeline
        workspaceId="ws-1"
        initialStartDate="2026-09-01"
        initialEndDate="2026-09-15"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('FE UI Component')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('FE UI Component'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Area Delivery')).toBeInTheDocument();
    expect(within(dialog).getByText('FE UI Component')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Membuat komponen UI yang dapat digunakan ulang.'),
    ).toBeInTheDocument();
    expect(taskService.getTask).toHaveBeenCalledWith('ws-1', 'sub-1');
    expect(within(dialog).getByRole('link', { name: 'Buka di Task Hub' })).toHaveAttribute(
      'href',
      '/projects/ws-1/tasks/sub-1',
    );
  });

  test('displays redacted alert when clicking a redacted subtask bar', async () => {
    vi.mocked(capacityService.getTeamTimeline).mockResolvedValue(mockTimelineData);

    render(
      <TeamCapacityTimeline
        workspaceId="ws-1"
        initialStartDate="2026-09-01"
        initialEndDate="2026-09-15"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Pekerjaan Aktif Lain')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pekerjaan Aktif Lain'));

    await waitFor(() => {
      expect(
        screen.getByText(/Sesuai kebijakan privasi lintas-workspace \(AUTH-011\)/),
      ).toBeInTheDocument();
    });
  });

  test('renders error state and retries on button click', async () => {
    vi.mocked(capacityService.getTeamTimeline)
      .mockRejectedValueOnce(new Error('Gagal mengambil data timeline'))
      .mockResolvedValueOnce(mockTimelineData);

    render(
      <TeamCapacityTimeline
        workspaceId="ws-1"
        initialStartDate="2026-09-01"
        initialEndDate="2026-09-15"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Gagal mengambil data timeline/)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: 'Coba Lagi' });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Developer Satu')).toBeInTheDocument();
    });
  });

  test('applies a custom date range through the shared DateRangePicker', async () => {
    vi.mocked(capacityService.getTeamTimeline).mockResolvedValue(mockTimelineData);

    render(
      <TeamCapacityTimeline
        workspaceId="ws-1"
        initialStartDate="2026-09-01"
        initialEndDate="2026-09-15"
      />,
    );

    await waitFor(() => {
      expect(capacityService.getTeamTimeline).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pilih rentang tanggal' }));
    fireEvent.change(screen.getByLabelText('Tanggal Mulai'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Tanggal Akhir'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan Rentang' }));

    await waitFor(() => {
      expect(capacityService.getTeamTimeline).toHaveBeenLastCalledWith(
        'ws-1',
        expect.objectContaining({ startDate: '2026-10-01', endDate: '2026-10-31' }),
      );
    });
  });
});
