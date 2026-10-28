import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronsUpDown,
  Crown,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createWorkspace, fetchWorkspaces, setActiveWorkspaceId } from '../../store/workspaceSlice';
import { canCreateWorkspace } from '../../lib/permissions/workspacePermissions';
import { selectCurrentUserRole } from '../../store/authSlice';
import { enqueueSnackbar } from '../../store/uiSlice';
import { Input } from '../ui/atoms/Input';
import { Textarea } from '../ui/atoms/Textarea';
import { Modal } from '../ui/molecules/Modal';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';

interface WorkspaceSwitcherProps {
  /** Called after a navigation or selection, e.g. to close the mobile navigation drawer. */
  onNavigate?: () => void;
}

/**
 * Workspace selector shown at the top of the Sidebar (ADR-035). It keeps the existing
 * workspace list, Leader Hub shortcut, and role-gated workspace creation.
 */
export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ onNavigate }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, activeWorkspaceId, isLoading, error } = useAppSelector(
    (state) => state.workspace,
  );
  const currentUserRole = useAppSelector(selectCurrentUserRole);

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismissableLayer(menuRef, isOpen, () => setIsOpen(false));

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const userRole = (
    activeWorkspace?.role ||
    activeWorkspace?.myRole ||
    currentUserRole ||
    ''
  ).toLowerCase();
  const canAccessLeaderHub = ['owner', 'admin'].includes(userRole);
  const mayCreateWorkspace = canCreateWorkspace(currentUserRole);
  const isLeaderHubActive = location.pathname === '/leader-hub';

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await dispatch(
        createWorkspace({ name: newName.trim(), description: newDescription.trim() || undefined }),
      ).unwrap();
      dispatch(enqueueSnackbar(`Workspace "${newName.trim()}" berhasil dibuat.`, 'success'));
      setNewName('');
      setNewDescription('');
      setShowCreateModal(false);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Workspace gagal dibuat.', 'error'),
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ganti workspace"
        aria-expanded={isOpen}
        className="flex min-h-[40px] w-full items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-3 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B1E743]/30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden="true" />
        <span className="flex-1 truncate text-left">
          {isLoading ? 'Memuat...' : activeWorkspace ? activeWorkspace.name : 'Pilih Workspace'}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl ring-1 ring-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            <span>Workspaces ({workspaces.length})</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-[#B1E743]" />}
          </div>

          {canAccessLeaderHub && (
            <div className="mb-1 border-b border-stone-100 pb-1 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  navigate('/leader-hub');
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  isLeaderHubActive
                    ? 'bg-[#B1E743] text-[#141413]'
                    : 'text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                <Crown className="h-4 w-4 shrink-0 text-[#B1E743]" aria-hidden="true" />
                <span className="flex flex-col text-left">
                  <span className="font-bold">Executive Leader Hub</span>
                  <span className="text-[10px] font-normal text-stone-400">
                    Lintas Semua Workspace
                  </span>
                </span>
              </button>
            </div>
          )}

          {error ? (
            <div className="my-1 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <p className="font-medium">{error}</p>
                <button
                  type="button"
                  onClick={() => dispatch(fetchWorkspaces())}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold underline"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" /> Coba lagi
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto py-1">
              {workspaces.map((ws) => {
                const isSelected = ws.id === activeWorkspace?.id;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      dispatch(setActiveWorkspaceId(ws.id));
                      setIsOpen(false);
                      onNavigate?.();
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#B1E743] font-semibold text-[#141413]'
                        : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#141413]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}

          {mayCreateWorkspace && (
            <div className="border-t border-stone-100 pt-1 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Buat Workspace</span>
              </button>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Buat Workspace Baru"
        description="Siapkan workspace agar tim dapat mengelola folder, task, lampiran, dan kolaborasi."
        primaryActionLabel="Buat Workspace"
        secondaryActionLabel="Batal"
        onPrimaryAction={handleCreate}
        isPrimaryLoading={isCreating}
      >
        <div className="space-y-4">
          <Input
            label="Nama Workspace"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="Contoh: Platform Engineering Inti"
            autoFocus
          />
          <Textarea
            label="Deskripsi"
            rows={3}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Deskripsi singkat tujuan workspace (opsional)..."
          />
        </div>
      </Modal>
    </div>
  );
};
