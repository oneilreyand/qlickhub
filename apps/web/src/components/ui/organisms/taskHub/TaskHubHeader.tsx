import React from 'react';
import { Plus, RefreshCw, Folder } from 'lucide-react';
import { Button } from '../../atoms/Button';

interface TaskHubHeaderProps {
  workspaceName: string;
  canCreateTask: boolean;
  isRefreshing: boolean;
  onCreateTask: () => void;
  onRefresh: () => void;
  onOpenMobileFolders: () => void;
}

export const TaskHubHeader: React.FC<TaskHubHeaderProps> = ({
  workspaceName,
  canCreateTask,
  isRefreshing,
  onCreateTask,
  onRefresh,
  onOpenMobileFolders,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#22201F] tracking-tight dark:text-white">
            Task Hub
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1 dark:text-stone-400">
            QA-native delivery workspace for {workspaceName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateTask && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateTask}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Task
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMobileFolders}
          leftIcon={<Folder className="h-4 w-4 text-amber-500" />}
        >
          Browse Folders
        </Button>
      </div>
    </div>
  );
};
