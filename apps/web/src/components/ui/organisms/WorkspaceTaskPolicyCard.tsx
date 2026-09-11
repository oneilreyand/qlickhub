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
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          Kebijakan Pembuatan Task oleh QA
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Pembuatan Task Langsung oleh Anggota QA
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
              {allowQaTaskCreation
                ? 'Aktif (default): Anggota QA dapat membuat dan menugaskan parent Task kepada anggota workspace.'
                : 'Dibatasi: Anggota QA hanya dapat menugaskan Task baru kepada dirinya sendiri atau membiarkannya tanpa pelaksana.'}
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
            Hanya Owner atau Admin Workspace yang dapat mengubah kebijakan pembuatan Task.
          </p>
        )}
      </div>
    </Card>
  );
};
