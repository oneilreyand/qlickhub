import React from 'react';
import { Shield } from 'lucide-react';
import { Card } from '../atoms/Card';
import { ToggleSwitch } from '../atoms/Checkbox';

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

          <ToggleSwitch
            checked={allowQaTaskCreation}
            disabled={!canManage || isUpdating}
            onChange={onToggle}
          />
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
