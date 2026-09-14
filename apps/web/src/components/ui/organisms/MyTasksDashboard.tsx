import React, { useState } from 'react';
import { CheckSquare, ListChecks, Plus, UserRoundCheck } from 'lucide-react';
import type { Task, WorkQueueItem, WorkspaceRole } from '@qlick/contracts';
import type {
  CreatedByMeTasksViewState,
  CreatedTaskPriorityFilter,
  CreatedTaskStatusFilter,
} from '../../../lib/hooks/useCreatedByMeTasks';
import type { RoleAwareWorkQueueViewState } from '../../../lib/hooks/useRoleAwareWorkQueue';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Tabs } from '../molecules/Tabs';
import { BugExperiencePanel } from './BugExperiencePanel';
import { CreatedByMeTaskPanel } from './myTasks/CreatedByMeTaskPanel';
import { RoleAwareWorkQueuePanel } from './myTasks/RoleAwareWorkQueuePanel';

export interface MyTasksDashboardProps {
  selectedTaskId: string | null;
  userRole?: WorkspaceRole | string;
  workspaceId?: string;
  queueState: RoleAwareWorkQueueViewState;
  createdTasksState: CreatedByMeTasksViewState;
  createdTasksSearch: string;
  createdTasksStatus: CreatedTaskStatusFilter;
  createdTasksPriority: CreatedTaskPriorityFilter;
  onRefreshQueue: () => void;
  onRefreshCreatedTasks: () => void;
  onOpenQueueItem: (item: WorkQueueItem) => void | Promise<void>;
  onOpenCreatedTask: (task: Task) => void | Promise<void>;
  onCreatedTasksSearchChange: (value: string) => void;
  onCreatedTasksStatusChange: (value: CreatedTaskStatusFilter) => void;
  onCreatedTasksPriorityChange: (value: CreatedTaskPriorityFilter) => void;
  onCreatedTasksPageChange: (page: number) => void;
  onBugDataChanged?: () => void;
  onCreateTaskClick: () => void;
}

export const MyTasksDashboard: React.FC<MyTasksDashboardProps> = ({
  selectedTaskId,
  userRole = 'dev',
  workspaceId,
  queueState,
  createdTasksState,
  createdTasksSearch,
  createdTasksStatus,
  createdTasksPriority,
  onRefreshQueue,
  onRefreshCreatedTasks,
  onOpenQueueItem,
  onOpenCreatedTask,
  onCreatedTasksSearchChange,
  onCreatedTasksStatusChange,
  onCreatedTasksPriorityChange,
  onCreatedTasksPageChange,
  onBugDataChanged,
  onCreateTaskClick,
}) => {
  const [activeView, setActiveView] = useState('attention');
  const normalizedRole = userRole.toLowerCase();
  const canCreateTask = ['owner', 'admin', 'po'].includes(normalizedRole);
  const showsBugWorkspace = ['dev', 'qa'].includes(normalizedRole);

  const handleOpenItem = async (item: WorkQueueItem) => {
    if (item.subjectType === 'bug') {
      const bugWorkspace = document.getElementById('my-task-bug-queue');
      bugWorkspace?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      bugWorkspace?.focus({ preventScroll: true });
      return;
    }
    await onOpenQueueItem(item);
  };

  return (
    <div className="w-full space-y-8 pb-12 animate-fadeIn">
      <div className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-[#B1E743]">
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
            <span>Work Hub Terintegrasi</span>
            <span className="text-stone-300 dark:text-stone-600">/</span>
            <span className="capitalize text-stone-500 dark:text-stone-400">Peran: {userRole}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            Tugas Saya
          </h1>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
            Mulai dari pekerjaan tersimpan yang membutuhkan perhatian Anda sekarang.
          </p>
        </div>

        {canCreateTask && (
          <Button
            variant="primary"
            onClick={onCreateTaskClick}
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Buat Task
          </Button>
        )}
      </div>

      <Tabs
        variant="pills"
        ariaLabel="Tampilan Tugas Saya"
        activeTabId={activeView}
        onChange={setActiveView}
        tabs={[
          {
            id: 'attention',
            label: 'Perlu Perhatian',
            icon: <ListChecks className="h-4 w-4" aria-hidden="true" />,
          },
          {
            id: 'created',
            label: 'Dibuat oleh Saya',
            count: createdTasksState.total,
            icon: <UserRoundCheck className="h-4 w-4" aria-hidden="true" />,
          },
        ]}
      />

      {activeView === 'attention' ? (
        <>
          <RoleAwareWorkQueuePanel
            state={queueState}
            selectedTaskId={selectedTaskId}
            onRefresh={onRefreshQueue}
            onOpenItem={handleOpenItem}
          />

          {workspaceId && showsBugWorkspace && (
            <section
              id="my-task-bug-queue"
              tabIndex={-1}
              aria-label={
                normalizedRole === 'dev' ? 'Pekerjaan Bug yang ditugaskan' : 'Pekerjaan retest Bug'
              }
              className="scroll-mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B1E743]/50"
            >
              <Card className="p-4 sm:p-5">
                <BugExperiencePanel
                  workspaceId={workspaceId}
                  userRole={userRole}
                  mode="role_queue"
                  onDataChanged={onBugDataChanged}
                />
              </Card>
            </section>
          )}
        </>
      ) : (
        <CreatedByMeTaskPanel
          state={createdTasksState}
          search={createdTasksSearch}
          status={createdTasksStatus}
          priority={createdTasksPriority}
          selectedTaskId={selectedTaskId}
          onSearchChange={onCreatedTasksSearchChange}
          onStatusChange={onCreatedTasksStatusChange}
          onPriorityChange={onCreatedTasksPriorityChange}
          onPageChange={onCreatedTasksPageChange}
          onRefresh={onRefreshCreatedTasks}
          onOpenTask={onOpenCreatedTask}
        />
      )}
    </div>
  );
};
