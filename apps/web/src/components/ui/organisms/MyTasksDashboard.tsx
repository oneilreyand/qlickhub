import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { WorkQueueItem, WorkspaceRole } from '@qlick/contracts';
import type { RoleAwareWorkQueueViewState } from '../../../lib/hooks/useRoleAwareWorkQueue';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Drawer } from '../molecules/Drawer';
import { BugExperiencePanel } from './BugExperiencePanel';
import { RoleAwareWorkQueuePanel } from './myTasks/RoleAwareWorkQueuePanel';

export interface MyTasksDashboardProps {
  selectedTaskId: string | null;
  userRole?: WorkspaceRole | string;
  workspaceId?: string;
  queueState: RoleAwareWorkQueueViewState;
  onRefreshQueue: () => void;
  onOpenQueueItem: (item: WorkQueueItem) => void | Promise<void>;
  onOpenTaskById: (taskId: string) => void | Promise<void>;
  onBugDataChanged?: () => void;
  onCreateTaskClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  po: 'Product Owner',
  product_owner: 'Product Owner',
  dev: 'Developer',
  developer: 'Developer',
  qa: 'QA',
  admin: 'Admin',
  owner: 'Owner',
};

function formatRoleLabel(role?: string): string {
  if (!role) return '';
  const normalized = role.toLowerCase();
  return ROLE_LABELS[normalized] || role;
}

export const MyTasksDashboard: React.FC<MyTasksDashboardProps> = ({
  selectedTaskId,
  userRole = 'dev',
  workspaceId,
  queueState,
  onRefreshQueue,
  onOpenQueueItem,
  onOpenTaskById,
  onBugDataChanged,
  onCreateTaskClick,
}) => {
  const [focusedBugId, setFocusedBugId] = useState<string | null>(null);
  const normalizedRole = userRole.toLowerCase();
  const canCreateTask = ['owner', 'admin', 'po'].includes(normalizedRole);

  const handleOpenItem = async (item: WorkQueueItem) => {
    if (item.subjectType === 'bug') {
      setFocusedBugId(item.subjectId);
      return;
    }
    await onOpenQueueItem(item);
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      <div className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            Tugas Saya
          </h1>
          {userRole && (
            <Badge variant="neutral" size="sm">
              {formatRoleLabel(userRole)}
            </Badge>
          )}
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

      <RoleAwareWorkQueuePanel
        state={queueState}
        selectedTaskId={selectedTaskId}
        onRefresh={onRefreshQueue}
        onOpenItem={handleOpenItem}
      />

      <Drawer
        isOpen={Boolean(focusedBugId)}
        onClose={() => setFocusedBugId(null)}
        title="Detail Bug"
        width="3xl"
      >
        {workspaceId && focusedBugId && (
          <div className="p-4 sm:p-6">
            <BugExperiencePanel
              workspaceId={workspaceId}
              userRole={userRole}
              mode="role_queue"
              onDataChanged={() => {
                onBugDataChanged?.();
                onRefreshQueue();
              }}
              onRetestRunStarted={async (qaSubtaskId) => {
                setFocusedBugId(null);
                await onOpenTaskById(qaSubtaskId);
              }}
              focusedBugId={focusedBugId}
              singleBugId={focusedBugId}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};
