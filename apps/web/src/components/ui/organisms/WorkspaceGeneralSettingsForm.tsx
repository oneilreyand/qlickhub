import React from 'react';
import { Settings, Check } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Button } from '../atoms/Button';

export interface WorkspaceGeneralSettingsFormProps {
  workspaceName: string;
  workspaceDesc: string;
  onNameChange: (value: string) => void;
  onDescChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  canManage: boolean;
}

export const WorkspaceGeneralSettingsForm: React.FC<WorkspaceGeneralSettingsFormProps> = ({
  workspaceName,
  workspaceDesc,
  onNameChange,
  onDescChange,
  onSubmit,
  isSaving,
  canManage,
}) => {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
        <Settings className="h-4 w-4 text-stone-700 dark:text-[#B1E743]" />
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">General Settings</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Workspace Name
          </label>
          <Input
            type="text"
            value={workspaceName}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={!canManage}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Description
          </label>
          <Textarea
            rows={3}
            value={workspaceDesc}
            onChange={(e) => onDescChange(e.target.value)}
            disabled={!canManage}
            placeholder="Optional brief workspace description..."
          />
        </div>

        {canManage && (
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="w-full"
            isLoading={isSaving}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        )}
      </form>
    </Card>
  );
};
