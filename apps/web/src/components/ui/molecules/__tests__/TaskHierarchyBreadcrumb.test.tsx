import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TaskHierarchyBreadcrumb } from '../TaskHierarchyBreadcrumb';

const featureTask: Task = {
  id: '10000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000002',
  title: 'Checkout Feature',
  status: 'in_progress',
  priority: 'high',
  reporterId: '10000000-0000-4000-8000-000000000003',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

const subtask: Task = {
  ...featureTask,
  id: '10000000-0000-4000-8000-000000000004',
  parentTaskId: featureTask.id,
  deliveryArea: 'frontend',
  title: 'Build checkout summary',
};

describe('TaskHierarchyBreadcrumb', () => {
  it('labels a root task as the Feature / Story', () => {
    render(<TaskHierarchyBreadcrumb task={featureTask} />);

    expect(screen.getByLabelText('Task hierarchy breadcrumb')).toHaveTextContent(
      'Feature / StoryCheckout Feature',
    );
    expect(screen.queryByRole('button', { name: 'Back to Feature' })).not.toBeInTheDocument();
  });

  it('shows the parent/subtask hierarchy and opens the parent Feature from both controls', () => {
    const onNavigateToTask = vi.fn();
    render(
      <TaskHierarchyBreadcrumb
        task={subtask}
        parentTask={featureTask}
        onNavigateToTask={onNavigateToTask}
      />,
    );

    expect(screen.getByLabelText('Task hierarchy breadcrumb')).toHaveTextContent(
      'Checkout Featurefrontend subtaskBuild checkout summary',
    );

    const parentLink = screen.getByRole('button', { name: 'Open parent Feature Checkout Feature' });
    const backToFeature = screen.getByRole('button', { name: 'Back to Feature' });
    expect(parentLink).toHaveClass('!min-h-[44px]');
    expect(backToFeature).toHaveClass('!min-h-[44px]');

    fireEvent.click(parentLink);
    fireEvent.click(backToFeature);

    expect(onNavigateToTask).toHaveBeenNthCalledWith(1, featureTask.id);
    expect(onNavigateToTask).toHaveBeenNthCalledWith(2, featureTask.id);
  });
});
