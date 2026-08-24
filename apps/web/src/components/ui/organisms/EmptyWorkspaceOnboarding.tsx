import React, { useState } from 'react';
import { Plus, Sparkles, RefreshCw, Lock, Building2 } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { useAppDispatch } from '../../../store/hooks';
import { createWorkspace, fetchWorkspaces } from '../../../store/workspaceSlice';
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

  const userRole = (localStorage.getItem('user_role') || '').toLowerCase();
  const canCreate = canCreateWorkspace(userRole);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchWorkspaces()).unwrap();
      dispatch(enqueueSnackbar('Workspace list refreshed', 'success'));
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
      dispatch(enqueueSnackbar(`Workspace "${name.trim()}" created successfully!`, 'success'));
      setName('');
      setDescription('');
      setShowModal(false);
    } catch (err: any) {
      dispatch(enqueueSnackbar(err?.message || 'Failed to create workspace', 'error'));
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
            alt="Create Workspace Illustration"
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
                <span>Welcome to Qlick Hub</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 text-stone-400" />
                <span>Workspace Access Required</span>
              </>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {canCreate ? 'Create Your First Workspace' : 'No Workspace Assigned Yet'}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            {canCreate
              ? "Workspaces organize your team's initiatives, folders, tasks, and collaboration. Get started by setting up your first team workspace."
              : 'You have not been assigned to any workspace yet. Please contact your workspace Owner, Admin, or Team Leader to be added to a workspace.'}
          </p>
        </div>

        <div className="pt-2">
          {canCreate ? (
            <Button
              onClick={() => setShowModal(true)}
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Create Workspace
            </Button>
          ) : (
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="md"
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Check Again
            </Button>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Workspace"
        description="Set up a workspace for your team to organize initiatives, tasks, attachments, and collaboration."
        primaryActionLabel="Create Workspace"
        secondaryActionLabel="Cancel"
        onPrimaryAction={handleCreate}
        isPrimaryLoading={isCreating}
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Core Engineering Platform"
            autoFocus
          />

          <Textarea
            label="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of team workspace purpose..."
          />
        </div>
      </Modal>
    </div>
  );
};
