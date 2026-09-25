import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Task } from '@qlick/contracts';

import { TaskDetailOverviewTab } from '../TaskDetailOverviewTab';

const baseTask: Task = {
  id: '10000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000002',
  title: 'Implement Payment Gateway',
  status: 'todo',
  priority: 'high',
  startDate: '2026-09-01',
  dueDate: '2026-09-10',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as Task;

const sampleSubtasks: Task[] = [
  {
    id: 'sub-1',
    workspaceId: baseTask.workspaceId,
    parentTaskId: baseTask.id,
    title: 'FE Payment Form',
    status: 'done',
    deliveryArea: 'frontend',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Task,
  {
    id: 'sub-2',
    workspaceId: baseTask.workspaceId,
    parentTaskId: baseTask.id,
    title: 'BE Charge API',
    status: 'in_progress',
    deliveryArea: 'backend',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Task,
  {
    id: 'sub-3',
    workspaceId: baseTask.workspaceId,
    parentTaskId: baseTask.id,
    title: 'QA E2E Validation',
    status: 'todo',
    deliveryArea: 'qa',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Task,
];

describe('TaskDetailOverviewTab', () => {
  const onDescriptionChangeMock = vi.fn();
  const onStatusChangeMock = vi.fn();
  const onPriorityChangeMock = vi.fn();
  const onFolderIdChangeMock = vi.fn();
  const onStartDateChangeMock = vi.fn();
  const onDueDateChangeMock = vi.fn();
  const onSelectTabMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders description editor and primary properties card', () => {
    render(
      <TaskDetailOverviewTab
        task={baseTask}
        description="Detail deskripsi kebutuhan task"
        onDescriptionChange={onDescriptionChangeMock}
        status="todo"
        onStatusChange={onStatusChangeMock}
        priority="high"
        onPriorityChange={onPriorityChangeMock}
        folderId={null}
        onFolderIdChange={onFolderIdChangeMock}
        startDate="2026-09-01"
        onStartDateChange={onStartDateChangeMock}
        dueDate="2026-09-10"
        onDueDateChange={onDueDateChangeMock}
        flatFolders={[{ id: 'folder-1', name: 'Core Sprints', depth: 0 }]}
        canEditTask={true}
        canEditStatus={true}
        canPlan={true}
        canEditPlanning={true}
        isAssignedExecutor={false}
        productBrief={null}
        subtasks={sampleSubtasks}
        members={[]}
        onSelectTab={onSelectTabMock}
      />,
    );

    expect(screen.getByText('Properti Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('todo');
    expect(screen.getByLabelText('Prioritas')).toHaveValue('high');
    expect(screen.getByLabelText('Lokasi Folder')).toBeInTheDocument();
    expect(screen.getByLabelText('Tanggal Mulai')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Tanggal Tenggat')).toHaveValue('2026-09-10');
  });

  test('calls appropriate change handlers when user interacts with properties', () => {
    render(
      <TaskDetailOverviewTab
        task={baseTask}
        description="Detail deskripsi"
        onDescriptionChange={onDescriptionChangeMock}
        status="todo"
        onStatusChange={onStatusChangeMock}
        priority="high"
        onPriorityChange={onPriorityChangeMock}
        folderId={null}
        onFolderIdChange={onFolderIdChangeMock}
        startDate="2026-09-01"
        onStartDateChange={onStartDateChangeMock}
        dueDate="2026-09-10"
        onDueDateChange={onDueDateChangeMock}
        flatFolders={[{ id: 'folder-1', name: 'Sprint 1', depth: 0 }]}
        canEditTask={true}
        canEditStatus={true}
        canPlan={true}
        canEditPlanning={true}
        isAssignedExecutor={false}
        productBrief={null}
        subtasks={[]}
        members={[]}
        onSelectTab={onSelectTabMock}
      />,
    );

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    expect(onStatusChangeMock).toHaveBeenCalledWith('in_progress');

    fireEvent.change(screen.getByLabelText('Prioritas'), { target: { value: 'urgent' } });
    expect(onPriorityChangeMock).toHaveBeenCalledWith('urgent');

    fireEvent.change(screen.getByLabelText('Tanggal Mulai'), { target: { value: '2026-09-05' } });
    expect(onStartDateChangeMock).toHaveBeenCalledWith('2026-09-05');
  });

  test('displays schedule error message when start date is after due date', () => {
    render(
      <TaskDetailOverviewTab
        task={baseTask}
        description="Schedule validation test"
        onDescriptionChange={onDescriptionChangeMock}
        status="todo"
        onStatusChange={onStatusChangeMock}
        priority="medium"
        onPriorityChange={onPriorityChangeMock}
        folderId={null}
        onFolderIdChange={onFolderIdChangeMock}
        startDate="2026-09-20"
        onStartDateChange={onStartDateChangeMock}
        dueDate="2026-09-10"
        onDueDateChange={onDueDateChangeMock}
        flatFolders={[]}
        canEditTask={true}
        canEditStatus={true}
        canPlan={true}
        canEditPlanning={true}
        isAssignedExecutor={false}
        productBrief={null}
        subtasks={[]}
        members={[]}
        onSelectTab={onSelectTabMock}
      />,
    );

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.id).toBe('task-detail-schedule-error');
  });

  test('navigates to subtasks tab when clicking role chip', () => {
    render(
      <TaskDetailOverviewTab
        task={baseTask}
        description="Subtasks chips test"
        onDescriptionChange={onDescriptionChangeMock}
        status="in_progress"
        onStatusChange={onStatusChangeMock}
        priority="medium"
        onPriorityChange={onPriorityChangeMock}
        folderId={null}
        onFolderIdChange={onFolderIdChangeMock}
        startDate="2026-09-01"
        onStartDateChange={onStartDateChangeMock}
        dueDate="2026-09-10"
        onDueDateChange={onDueDateChangeMock}
        flatFolders={[]}
        canEditTask={true}
        canEditStatus={true}
        canPlan={true}
        canEditPlanning={true}
        isAssignedExecutor={false}
        productBrief={null}
        subtasks={sampleSubtasks}
        members={[]}
        onSelectTab={onSelectTabMock}
      />,
    );

    const feButton = screen.getByTitle('Lihat subtask Frontend');
    expect(feButton).toBeInTheDocument();
    fireEvent.click(feButton);
    expect(onSelectTabMock).toHaveBeenCalledWith('subtasks');
  });

  test('navigates to requirement tab when clicking requirement button', () => {
    render(
      <TaskDetailOverviewTab
        task={baseTask}
        description="Requirement link test"
        onDescriptionChange={onDescriptionChangeMock}
        status="todo"
        onStatusChange={onStatusChangeMock}
        priority="medium"
        onPriorityChange={onPriorityChangeMock}
        folderId={null}
        onFolderIdChange={onFolderIdChangeMock}
        startDate="2026-09-01"
        onStartDateChange={onStartDateChangeMock}
        dueDate="2026-09-10"
        onDueDateChange={onDueDateChangeMock}
        flatFolders={[]}
        canEditTask={true}
        canEditStatus={true}
        canPlan={true}
        canEditPlanning={true}
        isAssignedExecutor={false}
        productBrief={null}
        subtasks={[]}
        members={[]}
        onSelectTab={onSelectTabMock}
      />,
    );

    const reqButton = screen.getByText('Lihat Spesifikasi & Requirement');
    fireEvent.click(reqButton);
    expect(onSelectTabMock).toHaveBeenCalledWith('prd');
  });

  test('shows read-only alert when user does not have edit permissions', () => {
    render(
      <TaskDetailOverviewTab
        task={baseTask}
        description="Read only test"
        onDescriptionChange={onDescriptionChangeMock}
        status="todo"
        onStatusChange={onStatusChangeMock}
        priority="low"
        onPriorityChange={onPriorityChangeMock}
        folderId={null}
        onFolderIdChange={onFolderIdChangeMock}
        startDate="2026-09-01"
        onStartDateChange={onStartDateChangeMock}
        dueDate="2026-09-10"
        onDueDateChange={onDueDateChangeMock}
        flatFolders={[]}
        canEditTask={false}
        canEditStatus={false}
        canPlan={false}
        canEditPlanning={false}
        isAssignedExecutor={false}
        productBrief={null}
        subtasks={[]}
        members={[]}
        onSelectTab={onSelectTabMock}
      />,
    );

    expect(screen.getByText('Task hanya dapat dilihat')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeDisabled();
    expect(screen.getByLabelText('Prioritas')).toBeDisabled();
    expect(screen.getByLabelText('Tanggal Mulai')).toBeDisabled();
  });
});
