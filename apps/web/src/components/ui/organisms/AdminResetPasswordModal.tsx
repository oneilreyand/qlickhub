import React from 'react';
import { Key } from 'lucide-react';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';

export interface AdminResetPasswordModalProps {
  targetUser: { id: string; name: string; email: string } | null;
  onClose: () => void;
  newPassword: string;
  isResetting: boolean;
  onPasswordChange: (password: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export const AdminResetPasswordModal: React.FC<AdminResetPasswordModalProps> = ({
  targetUser,
  onClose,
  newPassword,
  isResetting,
  onPasswordChange,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={Boolean(targetUser)}
      onClose={onClose}
      title="Reset Member Password"
      description={`Set a new temporary or permanent password for ${targetUser?.name} (${targetUser?.email}).`}
      primaryActionLabel="Reset Password"
      secondaryActionLabel="Cancel"
      onPrimaryAction={onSubmit}
      isPrimaryLoading={isResetting}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            New Password for Member
          </label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            placeholder="Minimum 6 characters"
            leftIcon={<Key className="h-4 w-4 text-stone-400" />}
          />
        </div>
      </form>
    </Modal>
  );
};
