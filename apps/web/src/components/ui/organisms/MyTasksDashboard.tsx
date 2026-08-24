import React from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import type { WorkQueueItem, WorkspaceRole } from '@qlick/contracts';
import type { RoleAwareWorkQueueViewState } from '../../../lib/hooks/useRoleAwareWorkQueue';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { BugExperiencePanel } from './BugExperiencePanel';
import { RoleAwareWorkQueuePanel } from './myTasks/RoleAwareWorkQueuePanel';

export interface MyTasksDashboardProps {
  selectedTaskId: string | null;
  userRole?: WorkspaceRole | string;
  workspaceId?: string;
  queueState: RoleAwareWorkQueueViewState;
  onRefreshQueue: () => void;
  onOpenQueueItem: (item: WorkQueueItem) => void | Promise<void>;
  onBugDataChanged?: () => void;
  onCreateTaskClick: () => void;
}

export const MyTasksDashboard: React.FC<MyTasksDashboardProps> = ({
  selectedTaskId,
  userRole = 'dev',
  workspaceId,
  queueState,
  onRefreshQueue,
  onOpenQueueItem,
  onBugDataChanged,
  onCreateTaskClick,
}) => {
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
            <span>Integrated Work Hub</span>
            <span className="text-stone-300 dark:text-stone-600">/</span>
            <span className="capitalize text-stone-500 dark:text-stone-400">Role: {userRole}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            My Tasks
          </h1>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
            Start with the persisted actions that need your attention now.
          </p>
        </div>

        {canCreateTask && (
          <Button
            variant="primary"
            onClick={onCreateTaskClick}
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Create Task
          </Button>
        )}
      </div>

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
          aria-label={normalizedRole === 'dev' ? 'Assigned Bug work actions' : 'Bug retest actions'}
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
    </div>
  );
};
