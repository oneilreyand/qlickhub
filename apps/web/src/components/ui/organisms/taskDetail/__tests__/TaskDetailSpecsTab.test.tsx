import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Task } from '@qlick/contracts';

import { TaskDetailSpecsTab } from '../TaskDetailSpecsTab';

vi.mock('../../RequirementManager', () => ({
  RequirementManager: ({ taskId }: { taskId: string }) => (
    <div data-testid="requirement-manager">Requirement Manager for {taskId}</div>
  ),
}));

vi.mock('../../FeatureReadinessPanel', () => ({
  FeatureReadinessPanel: ({ featureTaskId }: { featureTaskId: string }) => (
    <div data-testid="feature-readiness-panel">Feature Readiness for {featureTaskId}</div>
  ),
}));

vi.mock('../../RequirementFindingPanel', () => ({
  RequirementFindingPanel: ({ featureTaskId }: { featureTaskId: string }) => (
    <div data-testid="requirement-finding-panel">Requirement Finding for {featureTaskId}</div>
  ),
}));

const mockParentTask: Task = {
  id: 'task-root-1',
  workspaceId: 'ws-1',
  title: 'Root Feature',
  status: 'in_progress',
  priority: 'high',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as Task;

const mockSubtask: Task = {
  id: 'task-sub-1',
  parentTaskId: 'task-root-1',
  workspaceId: 'ws-1',
  title: 'Child Subtask',
  status: 'todo',
  priority: 'medium',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as Task;

describe('TaskDetailSpecsTab', () => {
  const onRequirementChangedMock = vi.fn();
  const onPlanSubtaskMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders RequirementManager at the top as primary content', () => {
    render(
      <TaskDetailSpecsTab
        task={mockParentTask}
        activeWorkspaceId="ws-1"
        userRole="po"
        onRequirementChanged={onRequirementChangedMock}
        onPlanSubtask={onPlanSubtaskMock}
      />,
    );

    expect(screen.getByTestId('requirement-manager')).toBeInTheDocument();
    expect(screen.getByText('Requirement Manager for task-root-1')).toBeInTheDocument();
    expect(screen.getByText('Kesiapan Fitur & Review Mutu')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-readiness-panel')).not.toBeInTheDocument();
  });

  test('toggles governance section to show FeatureReadinessPanel and RequirementFindingPanel', () => {
    render(
      <TaskDetailSpecsTab
        task={mockParentTask}
        activeWorkspaceId="ws-1"
        userRole="po"
        onRequirementChanged={onRequirementChangedMock}
        onPlanSubtask={onPlanSubtaskMock}
      />,
    );

    const toggleButton = screen.getByRole('button', {
      name: /Kesiapan Fitur & Review Mutu.*Buka Detail/i,
    });
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('feature-readiness-panel')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-finding-panel')).toBeInTheDocument();
    expect(screen.getByText('Sembunyikan')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Kesiapan Fitur & Review Mutu.*Sembunyikan/i }),
    );
    expect(screen.queryByTestId('feature-readiness-panel')).not.toBeInTheDocument();
  });

  test('does not show governance section for subtasks', () => {
    render(
      <TaskDetailSpecsTab
        task={mockSubtask}
        activeWorkspaceId="ws-1"
        userRole="dev"
        onRequirementChanged={onRequirementChangedMock}
        onPlanSubtask={onPlanSubtaskMock}
      />,
    );

    expect(screen.getByTestId('requirement-manager')).toBeInTheDocument();
    expect(screen.queryByText('Kesiapan Fitur & Review Mutu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-readiness-panel')).not.toBeInTheDocument();
  });
});
