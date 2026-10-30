import React from 'react';
import { Plus, Folder } from 'lucide-react';
import { Button } from '../../atoms/Button';

interface TaskHubHeaderProps {
  workspaceName: string;
  canCreateTask: boolean;
  onCreateTask: () => void;
  /** Entri satu langkah Feature Spec (AC-5.1); tersembunyi bila tidak diberikan. */
  onWriteIdea?: () => void;
  onOpenMobileFolders: () => void;
}

export const TaskHubHeader: React.FC<TaskHubHeaderProps> = ({
  workspaceName,
  canCreateTask,
  onCreateTask,
  onWriteIdea,
  onOpenMobileFolders,
}) => {
  return (
    <div className="space-y-3 border-b border-stone-200 pb-5 dark:border-slate-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-slate-400">
            Workspace / {workspaceName}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#22201F] dark:text-white">
            Task Hub
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500 dark:text-slate-400">
            Satu tempat untuk memahami dan melanjutkan delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canCreateTask && (
            <Button variant="outline" size="md" onClick={onCreateTask}>
              Buat Feature manual
            </Button>
          )}
          {canCreateTask && onWriteIdea && (
            <Button
              variant="primary"
              size="md"
              onClick={onWriteIdea}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tulis ide
            </Button>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMobileFolders}
          leftIcon={<Folder className="h-4 w-4 text-amber-500" />}
        >
          Lihat Folder
        </Button>
      </div>
    </div>
  );
};
