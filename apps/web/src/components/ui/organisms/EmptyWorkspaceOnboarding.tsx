import React, { useState } from 'react';
import { Building2, Plus, Sparkles } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { useAppDispatch } from '../../../store/hooks';
import { createWorkspace } from '../../../store/workspaceSlice';
import { enqueueSnackbar } from '../../../store/uiSlice';

export const EmptyWorkspaceOnboarding: React.FC = () => {
  const dispatch = useAppDispatch();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await dispatch(
        createWorkspace({
          name: name.trim(),
          description: description.trim() || undefined,
        })
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
    <div className="py-16 px-4 max-w-2xl mx-auto text-center animate-fadeIn">
      <Card className="p-8 sm:p-12 space-y-6 text-center border-stone-200/80 shadow-md">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-xs">
          <Building2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Welcome to QAREPORT Work Hub</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            Create Your First Workspace
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            Workspaces organize your team's initiatives, releases, tasks, and QA documentation. Get started by setting up your first team workspace.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => setShowModal(true)}
            size="lg"
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Create Workspace
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Workspace"
        description="Set up a workspace for your team to organize folders, tasks, and QA evidence."
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
            placeholder="e.g. Core Engineering QA"
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
