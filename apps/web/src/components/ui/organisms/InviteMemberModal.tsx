import React from 'react';
import { Mail, CheckSquare, Square } from 'lucide-react';
import { AssignableWorkspaceRole } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { WorkspaceItem } from '../../../lib/api/workspaceService';

export interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteEmail: string;
  inviteRole: AssignableWorkspaceRole;
  selectedWorkspaceIds: string[];
  workspaces: WorkspaceItem[];
  isInviting: boolean;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: AssignableWorkspaceRole) => void;
  onToggleWorkspaceSelection: (workspaceId: string) => void;
  onSelectAllWorkspaces: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  inviteEmail,
  inviteRole,
  selectedWorkspaceIds,
  workspaces,
  isInviting,
  onEmailChange,
  onRoleChange,
  onToggleWorkspaceSelection,
  onSelectAllWorkspaces,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite & Assign Team Member"
      description="Grant workspace capabilities by email, role, and assign to one or multiple workspaces."
      primaryActionLabel="Send Invitation"
      secondaryActionLabel="Cancel"
      onPrimaryAction={onSubmit}
      isPrimaryLoading={isInviting}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            User Email Address
          </label>
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            placeholder="colleague@company.com"
            leftIcon={<Mail className="h-4 w-4 text-stone-400" />}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Assign Workspace Role
          </label>
          <Select
            value={inviteRole}
            onChange={(e) => onRoleChange(e.target.value as AssignableWorkspaceRole)}
            aria-label="Assign Workspace Role"
          >
            <option value="admin">Admin — Workspace Administrator</option>
            <option value="po">PO — Product Owner</option>
            <option value="dev">Dev — Developer</option>
            <option value="qa">QA — QA Engineer</option>
          </Select>
        </div>

        {/* Multi-Workspace Assignment Checklist */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Target Workspaces ({selectedWorkspaceIds.length}/{workspaces.length})
            </label>
            <button
              type="button"
              onClick={onSelectAllWorkspaces}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {selectedWorkspaceIds.length === workspaces.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
            {workspaces.map((ws) => {
              const isSelected = selectedWorkspaceIds.includes(ws.id);
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onToggleWorkspaceSelection(ws.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-900 font-semibold dark:bg-indigo-950/60 dark:text-indigo-200'
                      : 'hover:bg-stone-100 text-stone-700 dark:hover:bg-stone-800 dark:text-stone-300'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-stone-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
};
