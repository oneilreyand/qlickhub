import React from 'react';
import type { Task } from '@qlick/contracts';

import { Card } from '../../atoms/Card';
import { RequirementManager, type RequirementManagerInitialState } from '../RequirementManager';

export interface TaskDetailSpecsTabProps {
  task: Task;
  activeWorkspaceId: string | null;
  userRole: string;
  onRequirementChanged: () => void;
  requirementInitialState?: RequirementManagerInitialState;
}

export const TaskDetailSpecsTab: React.FC<TaskDetailSpecsTabProps> = ({
  task,
  activeWorkspaceId,
  userRole,
  onRequirementChanged,
  requirementInitialState,
}) => {
  return (
    <Card className="border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90 sm:p-5">
      <RequirementManager
        workspaceId={activeWorkspaceId || task.workspaceId}
        taskId={task.id}
        userRole={(userRole || 'dev') as any}
        onRequirementChanged={onRequirementChanged}
        initialState={requirementInitialState}
      />
    </Card>
  );
};
