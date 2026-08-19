import React from 'react';
import { Shield } from 'lucide-react';
import { Card } from '../atoms/Card';

export interface WorkspaceTaskPolicyCardProps {
  allowQaTaskCreation: boolean;
  canManage: boolean;
  isUpdating: boolean;
  onToggle: (checked: boolean) => void;
}

export const WorkspaceTaskPolicyCard: React.FC<WorkspaceTaskPolicyCardProps> = ({
  allowQaTaskCreation,
  canManage,
  isUpdating,
  onToggle,
}) => {
  return (
    <Card id="task-policy" className="p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
        <Shield className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">QA Task Creation Policy</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Direct Task Creation for QA Members
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
              {allowQaTaskCreation
                ? 'Enabled (Default): QA members can create and assign parent tasks to any workspace member.'
                : 'Restricted: QA members can only assign new tasks to themselves or leave them unassigned.'}
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center shrink-0">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={allowQaTaskCreation}
              disabled={!canManage || isUpdating}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <div className="peer h-6 w-11 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#22201F] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-stone-700 dark:peer-checked:bg-[#B1E743] dark:peer-checked:after:bg-stone-900" />
          </label>
        </div>

        {!canManage && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
            Only Workspace Owner or Admin can modify task creation policy settings.
          </p>
        )}
      </div>
    </Card>
  );
};
