import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { createDeliveryTraceFixture } from '../../../../test/deliveryTraceFixture';
import { createReleaseReadinessViewState } from '../../../../test/releaseReadinessFixture';
import { TaskCollection, EMPTY_TASKS_ILLUSTRATION_URL } from '../TaskCollection';

const mockTasks: Task[] = [
  {
    id: 'task-1',
    workspaceId: 'ws-1',
    folderId: 'f-1',
    title: 'Design Wireframes',
    description: 'Create Figma wireframes',
    status: 'todo',
    priority: 'high',
    position: 1,
    reporterId: 'user-1',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'task-2',
    workspaceId: 'ws-1',
    folderId: 'f-1',
    title: 'Implement Authentication',
    description: 'Build JWT auth API',
    status: 'in_progress',
    priority: 'urgent',
    position: 2,
    reporterId: 'user-1',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
];

describe('TaskCollection Organism', () => {
  it('renders no tasks illustration and message when task list is empty', () => {
    render(<TaskCollection tasks={[]} folders={[]} isLoading={false} onSelect={vi.fn()} />);

    const imgs = screen.getAllByAltText('No Tasks in Task Hub Illustration');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0]).toHaveAttribute('src', EMPTY_TASKS_ILLUSTRATION_URL);
    expect(EMPTY_TASKS_ILLUSTRATION_URL).toBe(
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787027457/ChatGPT_Image_Aug_18_2026_11_30_28_AM.png',
    );
    expect(screen.getAllByText('No tasks found').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Collapse All button and toggles collapse / expand for all groups', () => {
    render(<TaskCollection tasks={mockTasks} folders={[]} isLoading={false} onSelect={vi.fn()} />);

    // Initial state: Both tasks visible, button says "Collapse All"
    expect(screen.getByText(/status groups/i)).toBeInTheDocument();
    const collapseButton = screen.getByRole('button', { name: /collapse all/i });
    expect(collapseButton).toBeInTheDocument();

    expect(screen.getAllByText('Design Wireframes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Implement Authentication').length).toBeGreaterThanOrEqual(1);

    // Click "Collapse All" -> button becomes "Expand All" and task items are hidden
    fireEvent.click(collapseButton);

    expect(screen.getByRole('button', { name: /expand all/i })).toBeInTheDocument();
    expect(screen.queryByText('Design Wireframes')).not.toBeInTheDocument();
    expect(screen.queryByText('Implement Authentication')).not.toBeInTheDocument();

    // Click "Expand All" -> tasks become visible again and button returns to "Collapse All"
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));

    expect(screen.getByRole('button', { name: /collapse all/i })).toBeInTheDocument();
    expect(screen.getAllByText('Design Wireframes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Implement Authentication').length).toBeGreaterThanOrEqual(1);
  });

  it('renders compact Delivery Trace state in mobile cards and the desktop table', () => {
    const trace = createDeliveryTraceFixture({
      structural: {
        ...createDeliveryTraceFixture().structural,
        totalRequirements: 2,
        fullyCoveredRequirements: 1,
        coveragePercent: 50,
      },
      execution: {
        ...createDeliveryTraceFixture().execution,
        failedTestCases: 1,
        passedTestCases: 0,
        passRatePercent: 0,
      },
    });

    render(
      <TaskCollection
        tasks={mockTasks}
        folders={[]}
        isLoading={false}
        deliveryTraceStateByTaskId={{
          'task-1': { trace, isLoading: false, error: null, permissionDenied: false },
          'task-2': { trace: null, isLoading: false, error: null, permissionDenied: true },
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Structure 1/2')).toHaveLength(2);
    expect(screen.getAllByText('Tests 1 failed')).toHaveLength(2);
    expect(screen.getAllByText('Trace restricted')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Delivery & Release' })).toBeInTheDocument();
  });

  it('renders the shared backend Release Readiness signal in mobile and desktop rows', () => {
    render(
      <TaskCollection
        tasks={[mockTasks[0]]}
        folders={[]}
        isLoading={false}
        releaseReadinessStateByTaskId={{
          [mockTasks[0].id]: createReleaseReadinessViewState(),
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Not release ready · 1 failed')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Delivery & Release' })).toBeInTheDocument();
  });

  it('opens a task from the keyboard without hiding its collection', () => {
    const onSelect = vi.fn();
    render(
      <TaskCollection tasks={[mockTasks[0]]} folders={[]} isLoading={false} onSelect={onSelect} />,
    );

    fireEvent.keyDown(screen.getByLabelText('Inspect task Design Wireframes'), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(mockTasks[0]);
    expect(screen.getAllByText('Design Wireframes').length).toBeGreaterThanOrEqual(1);
  });
});
