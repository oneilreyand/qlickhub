import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Task, FolderTreeNode } from '@qlick/contracts';
import { TaskTimelineView } from '../TaskTimelineView';

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
  it('renders loading skeleton when isLoading is true', () => {
    render(
      <TaskTimelineView
        tasks={[]}
        isLoading={true}
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText('Time Scale:')).not.toBeInTheDocument();
  });

  it('renders empty message and illustration when tasks array is empty and not loading', () => {
    render(
      <TaskTimelineView
        tasks={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('No tasks in current view')).toBeInTheDocument();
    const img = screen.getByAltText('No Tasks in Timeline Illustration');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png'
    );
  });

  it('renders scheduled tasks in folder groups and supports time scale switching', () => {
    const handleSelect = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={handleSelect}
      />
    );

    // Check Folder Names
    expect(screen.getByText('Frontend Workstream')).toBeInTheDocument();
    expect(screen.getByText('Backend API')).toBeInTheDocument();

    // Check Task Titles
    expect(screen.getAllByText('Implement OAuth Flow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Database Migration Service').length).toBeGreaterThan(0);

    // Check Scale buttons
    const dayBtn = screen.getByRole('button', { name: /^day$/i });
    const monthBtn = screen.getByRole('button', { name: /^month$/i });

    fireEvent.click(dayBtn);
    expect(dayBtn.className).toContain('bg-stone-900');

    fireEvent.click(monthBtn);
    expect(monthBtn.className).toContain('bg-stone-900');
  });

  it('triggers onSelect when clicking a task bar or label', () => {
    const handleSelect = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={handleSelect}
      />
    );

    const taskElements = screen.getAllByText('Implement OAuth Flow');
    fireEvent.click(taskElements[0]);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        title: 'Implement OAuth Flow',
      })
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
      />
    );

    // Check unscheduled header
    const unscheduledToggle = screen.getByText(/Unscheduled Tasks \(1\)/i);
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
      })
    );
  });

  it('triggers onToggleExpand when Full Width button is clicked', () => {
    const handleToggleExpand = vi.fn();
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
        isExpanded={false}
        onToggleExpand={handleToggleExpand}
      />
    );

    const fullWidthBtn = screen.getByRole('button', { name: /expand full width timeline/i });
    expect(fullWidthBtn).toBeInTheDocument();
    fireEvent.click(fullWidthBtn);
    expect(handleToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('toggles expand all subtasks when Expand All Subtasks button is clicked', async () => {
    render(
      <TaskTimelineView
        tasks={mockTasks}
        folders={mockFolders}
        isLoading={false}
        onSelect={vi.fn()}
      />
    );

    const expandAllBtn = screen.getByRole('button', { name: /expand or collapse all subtask streams/i });
    expect(expandAllBtn).toBeInTheDocument();
    expect(screen.getByText('Expand All Subtasks')).toBeInTheDocument();

    fireEvent.click(expandAllBtn);
    expect(screen.getByText('Collapse Subtasks')).toBeInTheDocument();
  });
});

