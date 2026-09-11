import React, { useState } from 'react';
import { Plus, Sparkles, RefreshCw, Lock, Building2 } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { createWorkspace, fetchWorkspaces } from '../../../store/workspaceSlice';
import { selectCurrentUserRole } from '../../../store/authSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { canCreateWorkspace } from '../../../lib/permissions/workspacePermissions';

export const CREATE_WORKSPACE_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020941/create_workspace.png';

export const EmptyWorkspaceOnboarding: React.FC = () => {
  const dispatch = useAppDispatch();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userRole = useAppSelector(selectCurrentUserRole);
  const canCreate = canCreateWorkspace(userRole);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchWorkspaces()).unwrap();
      dispatch(enqueueSnackbar('Daftar workspace berhasil dimuat ulang.', 'success'));
    } catch {
      // Ignored
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await dispatch(
        createWorkspace({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      ).unwrap();
      dispatch(enqueueSnackbar(`Workspace "${name.trim()}" berhasil dibuat.`, 'success'));
      setName('');
      setDescription('');
      setShowModal(false);
    } catch (err: any) {
      dispatch(enqueueSnackbar(err?.message || 'Workspace gagal dibuat.', 'error'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="py-12 px-4 max-w-2xl mx-auto text-center animate-fadeIn">
      <Card className="p-8 sm:p-12 space-y-6 text-center border-stone-200/80 shadow-md">
        <div className="flex justify-center">
          <img
            src={CREATE_WORKSPACE_ILLUSTRATION_URL}
            alt="Ilustrasi membuat workspace"
            className="dark:hidden w-full max-w-[280px] sm:max-w-[360px] md:max-w-[420px] h-auto max-h-64 sm:max-h-76 object-contain mx-auto transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs"
            loading="lazy"
          />
          <div className="hidden dark:flex items-center justify-center py-4">
            <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-stone-900 border border-stone-800 shadow-inner">
              <div className="absolute inset-0 rounded-3xl bg-[#B1E743]/10 blur-xl pointer-events-none" />
              <Building2 className="h-9 w-9 text-[#B1E743]" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
            {canCreate ? (
              <>
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Selamat Datang di Qlick Hub</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 text-stone-400" />
                <span>Akses Workspace Diperlukan</span>
              </>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {canCreate ? 'Buat Workspace Pertama Anda' : 'Belum Ada Workspace untuk Anda'}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            {canCreate
              ? 'Workspace membantu tim mengelola inisiatif, folder, task, dan kolaborasi. Mulai dengan membuat workspace pertama untuk tim Anda.'
              : 'Anda belum menjadi anggota workspace mana pun. Hubungi Owner, Admin, atau Team Leader agar Anda ditambahkan ke workspace.'}
          </p>
        </div>

        <div className="pt-2">
          {canCreate ? (
            <Button
              onClick={() => setShowModal(true)}
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Buat Workspace
            </Button>
          ) : (
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="md"
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Coba Lagi
            </Button>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Buat Workspace Baru"
        description="Siapkan workspace agar tim dapat mengelola inisiatif, task, lampiran, dan kolaborasi."
        primaryActionLabel="Buat Workspace"
        secondaryActionLabel="Batal"
        onPrimaryAction={handleCreate}
        isPrimaryLoading={isCreating}
      >
        <div className="space-y-4">
          <Input
            label="Nama Workspace"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Contoh: Platform Engineering Inti"
            autoFocus
          />

          <Textarea
            label="Deskripsi"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat tujuan workspace (opsional)..."
          />
        </div>
      </Modal>
    </div>
  );
};
