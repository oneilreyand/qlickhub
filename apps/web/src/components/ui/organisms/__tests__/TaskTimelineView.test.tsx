import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task, FolderTreeNode } from '@qlick/contracts';
import { TaskTimelineView } from '../TaskTimelineView';

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    listSubtasks: vi.fn().mockResolvedValue({ tasks: [] }),
  },
}));

const mockFolders: FolderTreeNode[] = [
  {
    id: 'f-1',
    workspaceId: 'ws-1',
    name: 'Frontend Workstream',
    position: 1,
    createdBy: 'user-1',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    children: [],
  },
  {
    id: 'f-2',
    workspaceId: 'ws-1',
    name: 'Backend API',
    position: 2,
    createdBy: 'user-1',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    children: [],
  },
];

const mockTasks: Task[] = [
  {
    id: 'task-1',
    workspaceId: 'ws-1',
    folderId: 'f-1',
    title: 'Implement OAuth Flow',
    description: 'Set up Google OAuth',
    status: 'in_progress',
    priority: 'high',
    position: 1,
    reporterId: 'user-1',
    assigneeId: 'user-2',
    startDate: '2026-08-10',
    dueDate: '2026-08-25',
    subtaskSummary: {
      total: 3,
      completed: 1,
      areas: {
        frontend: { total: 2, completed: 1 },
        backend: { total: 1, completed: 0 },
        mobile: { total: 0, completed: 0 },
        fullstack: { total: 0, completed: 0 },
        qa: { total: 0, completed: 0 },
      },
    },
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
  },
  {
    id: 'task-2',
    workspaceId: 'ws-1',
    folderId: 'f-2',
    title: 'Database Migration Service',
    description: 'Run migrations on startup',
    status: 'done',
    priority: 'medium',
    position: 2,
    reporterId: 'user-1',
    assigneeId: 'user-3',
    startDate: '2026-08-01',
    dueDate: '2026-08-15',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  },
  {
    id: 'task-3',
    workspaceId: 'ws-1',
    folderId: 'f-1',
    title: 'Unscheduled Security Review',
    status: 'todo',
    priority: 'urgent',
    position: 3,
    reporterId: 'user-1',
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
  },
];

describe('TaskTimelineView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<TaskTimelineView tasks={[]} isLoading={true} onSelect={vi.fn()} />);
    expect(screen.queryByText('Calendar zoom:')).not.toBeInTheDocument();
  });

  it('renders empty message and illustration when tasks array is empty and not loading', () => {
    render(<TaskTimelineView tasks={[]} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Tidak ada Task pada tampilan ini')).toBeInTheDocument();
    const img = screen.getByAltText('Ilustrasi tidak ada Task di timeline');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png',
    );
  });

  it('renders scheduled tasks in folder groups and supports time scale switching', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));
    const handleSelect = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={handleSelect}
      />,
    );

    // Check Folder Names
    expect(screen.getByText('Frontend Workstream')).toBeInTheDocument();
    expect(screen.getByText('Backend API')).toBeInTheDocument();
    expect(screen.getByText('Jadwal Feature')).toBeInTheDocument();
    expect(screen.getByText(/Di luar rentang tampilan/)).toBeInTheDocument();

    // Check Task Titles
    expect(screen.getAllByText('Implement OAuth Flow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Database Migration Service').length).toBeGreaterThan(0);

    // Check Scale buttons
    const dayBtn = screen.getByRole('button', { name: /^Hari$/i });
    const monthBtn = screen.getByRole('button', { name: /^Bulan$/i });

    expect(screen.getByText('23 Agu 2026 – 24 Okt 2026')).toBeInTheDocument();
    fireEvent.click(dayBtn);
    expect(dayBtn.className).toContain('bg-[#B1E743]');
    expect(screen.getByText('31 Agu 2026 – 28 Sep 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /rentang kalender berikutnya/i }));
    expect(screen.getByText('1 Sep 2026 – 29 Sep 2026')).toBeInTheDocument();

    fireEvent.click(monthBtn);
    expect(monthBtn.className).toContain('bg-[#B1E743]');
    expect(screen.getByText('1 Jul 2026 – 28 Feb 2027')).toBeInTheDocument();
  });

  it('separates the persisted plan from open and completed delay extensions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));

    const delayedTasks: Task[] = [
      {
        ...mockTasks[0],
        id: 'open-delayed-task',
        title: 'Open delayed delivery',
        startDate: '2026-09-01',
        dueDate: '2026-09-05',
        status: 'in_progress',
      },
      {
        ...mockTasks[1],
        id: 'completed-delayed-task',
        title: 'Selesai delayed delivery',
        startDate: '2026-09-01',
        dueDate: '2026-09-03',
        completedAt: '2026-09-06T12:00:00.000Z',
        status: 'done',
      },
      {
        ...mockTasks[1],
        id: 'completed-on-time-task',
        title: 'Selesai on time',
        startDate: '2026-09-01',
        dueDate: '2026-09-03',
        completedAt: '2026-09-03T12:00:00.000Z',
        status: 'done',
      },
    ];

    render(
      <TaskTimelineView
        tasks={delayedTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('img', { name: /terlambat.*2 hari dari rencana.*masih terbuka/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: /terlambat.*3 hari dari rencana.*selesai 6 Sep/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: /completed on time.*beyond plan/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Terencana')).toBeInTheDocument();
    expect(screen.getByText('Perpanjangan keterlambatan')).toBeInTheDocument();
  });

  it('triggers onSelect when clicking a task bar or label', () => {
    const handleSelect = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={handleSelect}
      />,
    );

    const taskElements = screen.getAllByText('Implement OAuth Flow');
    fireEvent.click(taskElements[0]);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        title: 'Implement OAuth Flow',
      }),
    );
  });

  it('renders unscheduled tasks accordion for tasks lacking start and due dates', () => {
    const handleSelect = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={handleSelect}
      />,
    );

    // Check unscheduled header
    const unscheduledToggle = screen.getByText(/Task Belum Dijadwalkan \(1\)/i);
    expect(unscheduledToggle).toBeInTheDocument();

    // Click to expand
    fireEvent.click(unscheduledToggle);
    expect(screen.getByText('Unscheduled Security Review')).toBeInTheDocument();

    // Click unscheduled task
    fireEvent.click(screen.getByText('Unscheduled Security Review'));
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-3',
        title: 'Unscheduled Security Review',
      }),
    );
  });

  it('triggers onToggleExpand when Lebar Penuh button is clicked', () => {
    const handleToggleExpand = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
        isExpanded={false}
        onToggleExpand={handleToggleExpand}
      />,
    );

    const fullWidthBtn = screen.getByRole('button', { name: /buka timeline selebar layar/i });
    expect(fullWidthBtn).toBeInTheDocument();
    fireEvent.click(fullWidthBtn);
    expect(handleToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('toggles buka semua subtasks when Buka Semua Subtask button is clicked', async () => {
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    const expandAllBtn = screen.getByRole('button', {
      name: /buka atau tutup semua alur Subtask/i,
    });
    expect(expandAllBtn).toBeInTheDocument();
    expect(screen.getByText('Buka Semua Subtask')).toBeInTheDocument();

    fireEvent.click(expandAllBtn);
    expect(screen.getByText('Tutup Subtask')).toBeInTheDocument();
  });

  it('correctly aligns task bar and today marker on Day scale without time-of-day shift', () => {
    vi.useFakeTimers();
    // Simulate opening the app late at night on Sept 17 (22:34:52)
    vi.setSystemTime(new Date('2026-09-17T22:34:52'));

    const alignmentTask: Task = {
      id: 'task-bilong-v3',
      workspaceId: 'ws-1',
      folderId: 'f-1',
      title: 'bilong v3',
      status: 'in_progress',
      priority: 'high',
      position: 1,
      reporterId: 'user-1',
      startDate: '2026-09-14',
      dueDate: '2026-09-18',
      createdAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    };

    render(
      <TaskTimelineView
        tasks={[alignmentTask]}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    // Switch to Day scale
    const dayBtn = screen.getByRole('button', { name: /^Hari$/i });
    fireEvent.click(dayBtn);

    // Find the task bar button
    const taskBar = screen.getByRole('button', { name: /Lihat bilong v3/i });
    expect(taskBar).toBeInTheDocument();

    // 29 columns in Day scale:
    // start is Sep 10 (day 0), Sep 14 is day 4 (4 / 29 * 100% = 13.7931%)
    // duration 5 days: Sep 14 to Sep 18 inclusive (5 / 29 * 100% = 17.2414%)
    const styleAttr = taskBar.getAttribute('style') || '';
    expect(styleAttr).toContain('left: 13.7931');
    expect(styleAttr).toContain('width: 17.2413');

    // Verify Today marker floating badge ("Hari Ini") is positioned inside Sept 17 column (day 7 to day 8: 24.1379% to 27.5862%)
    const todayBadges = screen.getAllByText('Hari Ini');
    const floatingPinBadge = todayBadges.find((el) =>
      el.className.includes('rounded-full'),
    );
    expect(floatingPinBadge).toBeDefined();
    const todayMarkerLine = floatingPinBadge!.closest('.absolute.top-0.bottom-0');
    expect(todayMarkerLine).not.toBeNull();
    const markerStyle = todayMarkerLine?.getAttribute('style') || '';
    const leftMatch = markerStyle.match(/left:\s*([\d.]+)%/);
    expect(leftMatch).not.toBeNull();
    const markerLeft = parseFloat(leftMatch![1]);
    // Sept 17 column spans from (7 / 29 * 100) = 24.1379% to (8 / 29 * 100) = 27.5862%
    expect(markerLeft).toBeGreaterThanOrEqual(24.1379);
    expect(markerLeft).toBeLessThanOrEqual(27.5862);
  });

  it('keeps active week column highlighted when current time is Saturday evening', () => {
    vi.useFakeTimers();
    // Saturday evening: 2026-09-19 22:30:00 (end of week Sep 13 – Sep 19)
    vi.setSystemTime(new Date('2026-09-19T22:30:00'));

    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    // In week scale, the column for Sep 13 – 19 should have isToday: true (text-amber-600)
    const weekLabel = screen.getByText('13 Sep');
    const weekColHeader = weekLabel.closest('div');
    expect(weekColHeader?.className).toContain('bg-amber-50/60');
  });
});

