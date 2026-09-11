import React, { useState, useEffect, useRef } from 'react';
import { authService, User } from '../../../lib/api/authService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { User as UserIcon, Lock, ShieldCheck, Check } from 'lucide-react';
import { Alert } from '../atoms/Alert';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated?: (updatedUser: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);

  // Sync state only on open transition so typed edits are not wiped
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current && currentUser) {
      setName(currentUser.name || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setProfileError(null);
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      const updated = await authService.updateProfile({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      dispatch(enqueueSnackbar('Profil berhasil diperbarui', 'success'));
      if (onProfileUpdated) onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setProfileError(err?.message || 'Profil gagal diperbarui.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    try {
      await authService.changePassword({ currentPassword, newPassword });
      dispatch(enqueueSnackbar('Kata sandi berhasil diubah', 'success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setPasswordError(
        err?.message || 'Kata sandi gagal diubah. Pastikan kata sandi saat ini sudah benar.',
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan Akun" size="md">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#B1E743] text-stone-900 dark:text-[#B1E743] dark:border-[#B1E743]'
                : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Detail Profil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'password'
                ? 'border-[#B1E743] text-stone-900 dark:text-[#B1E743] dark:border-[#B1E743]'
                : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            <Lock className="h-4 w-4" />
            Ubah Kata Sandi
          </button>
        </div>

        {/* Tab 1: Profile Information */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileError && <Alert tone="error">{profileError}</Alert>}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Alamat Email (hanya baca)
              </label>
              <Input
                value={currentUser?.email || ''}
                disabled
                className="opacity-70 bg-stone-100 dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Nama Lengkap
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap Anda"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                URL Gambar Avatar (Opsional)
              </label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button
                type="submit"
                isLoading={isUpdatingProfile}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && <Alert tone="error">{passwordError}</Alert>}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Kata Sandi Saat Ini
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi saat ini"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Kata Sandi Baru
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan kembali kata sandi baru"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button
                type="submit"
                isLoading={isChangingPassword}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                Perbarui Kata Sandi
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
