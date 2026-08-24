import React, { useState } from 'react';
import { Building2, Plus, CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { Modal } from '../../molecules/Modal';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { createWorkspace, fetchWorkspaces } from '../../../../store/workspaceSlice';
import { enqueueSnackbar } from '../../../../store/uiSlice';
import { canCreateWorkspace } from '../../../../lib/permissions/workspacePermissions';

interface OnboardingWorkspaceStepProps {
  role: string;
}

export const OnboardingWorkspaceStep: React.FC<OnboardingWorkspaceStepProps> = ({ role }) => {
  const dispatch = useAppDispatch();
  const normalizedRole = role.toLowerCase();
  const canCreate = canCreateWorkspace(normalizedRole);

  const { workspaces, activeWorkspaceId, isLoading } = useAppSelector((state) => state.workspace);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchWorkspaces()).unwrap();
      dispatch(enqueueSnackbar('Daftar workspace diperbarui', 'success'));
    } catch {
      // Ignored
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await dispatch(
        createWorkspace({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      ).unwrap();
      dispatch(enqueueSnackbar(`Workspace "${name.trim()}" berhasil dibuat!`, 'success'));
      setName('');
      setDescription('');
      setShowCreateModal(false);
    } catch (err: any) {
      dispatch(enqueueSnackbar(err?.message || 'Gagal membuat workspace', 'error'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600 dark:text-[#B1E743]" />
          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
            Konteks Ruang Kerja & Tim (Workspace)
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Semua inisiatif rilis, folder sprint, dan kolaborasi subtask diorganisasikan di dalam
          Workspace tim.
        </p>
      </div>

      {/* Case 1: User Has Active Workspace */}
      {workspaces.length > 0 && activeWorkspace ? (
        <Card className="p-5 sm:p-6 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-stone-900 text-emerald-700 dark:text-[#B1E743] border border-emerald-100/80 dark:border-stone-800 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                    {activeWorkspace.name}
                  </h4>
                  <Badge variant="passed" size="sm">
                    Aktif
                  </Badge>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {activeWorkspace.description ||
                    'Ruang kerja tim utama untuk pengembangan & rilis QA.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                isLoading={isRefreshing || isLoading}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Segarkan
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800">
              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Status Keanggotaan
              </span>
              <p className="text-xs font-bold text-stone-900 dark:text-white mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Terhubung ke Workspace</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800">
              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Peran Anda di Tim
              </span>
              <p className="text-xs font-bold text-stone-900 dark:text-white mt-1 capitalize">
                {activeWorkspace.myRole || activeWorkspace.role || normalizedRole}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800">
              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Total Workspace
              </span>
              <p className="text-xs font-bold text-stone-900 dark:text-white mt-1">
                {workspaces.length} Workspace
              </p>
            </div>
          </div>

          {canCreate && (
            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Buat Workspace Tambahan
              </Button>
            </div>
          )}
        </Card>
      ) : (
        /* Case 2: User Has NO Workspace Yet */
        <Card className="p-6 sm:p-8 border-stone-200/80 dark:border-stone-800 dark:bg-[#1C1A19] text-center space-y-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 mx-auto">
            {canCreate ? (
              <Building2 className="h-8 w-8 text-[#B1E743]" />
            ) : (
              <Lock className="h-8 w-8 text-stone-400" />
            )}
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
              {canCreate
                ? 'Buat Workspace Tim Pertama Anda'
                : 'Belum Ada Workspace yang Ditugaskan'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {canCreate
                ? 'Sebagai Admin / PO, Anda dapat membuat workspace baru untuk mulai mengorganisasikan sprint dan mengundang tim.'
                : 'Akun Anda saat ini belum ditambahkan ke workspace proyek mana pun. Silakan hubungi Administrator atau Product Owner Anda untuk mendapatkan akses.'}
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            {canCreate ? (
              <Button
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="h-4 w-4" />}
                size="md"
              >
                Buat Workspace Sekarang
              </Button>
            ) : (
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="md"
                isLoading={isRefreshing || isLoading}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Periksa Ulang Undangan
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modal Molecule: Create Workspace */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Buat Workspace Baru"
        description="Siapkan workspace untuk tim Anda mengorganisasikan folder rilis, task, bukti pengujian, dan kolaborasi."
        primaryActionLabel="Buat Workspace"
        secondaryActionLabel="Batal"
        onPrimaryAction={handleCreateWorkspace}
        isPrimaryLoading={isCreating}
      >
        <div className="space-y-4 text-left">
          <Input
            label="Nama Workspace"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Contoh: Core Engineering & QA"
            autoFocus
          />

          <Textarea
            label="Deskripsi Workspace (Opsional)"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat tujuan proyek / tim workspace..."
          />
        </div>
      </Modal>
    </div>
  );
};
