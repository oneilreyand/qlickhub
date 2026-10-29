import React, { useEffect, useState } from 'react';
import type { FolderTreeNode } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { FolderLocationSelect } from '../molecules/FolderLocationSelect';
import { featurePlanService } from '../../../lib/api/featurePlanService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';

export interface FeaturePlanCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string | null;
  folders: FolderTreeNode[];
  defaultFolderId?: string | null;
  onCreated: (featureTaskId: string) => void;
}

/** Planner menyimpan ide Feature sebagai Plan (P5a-1, AC-5.1), tanpa AI. */
export const FeaturePlanCreateModal: React.FC<FeaturePlanCreateModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  folders,
  defaultFolderId,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setFolderId(defaultFolderId ?? null);
  }, [isOpen, defaultFolderId]);

  const canSubmit = Boolean(workspaceId) && title.trim().length > 0 && idea.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await featurePlanService.createFeaturePlan(workspaceId, {
        title: title.trim(),
        idea: idea.trim(),
        folderId,
      });
      dispatch(enqueueSnackbar('Plan tersimpan. Feature dibuat di tahap Plan.', 'success'));
      setTitle('');
      setIdea('');
      onClose();
      onCreated(result.feature.id);
    } catch (error) {
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'Plan gagal disimpan.', 'error'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mulai dari ide (Plan)"
      description="Simpan ide Feature lebih dulu. PRD dan subtask disusun di tahap berikutnya."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="feature-plan-title"
            className="mb-1 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            Judul Feature <span className="text-rose-500">*</span>
          </label>
          <Input
            id="feature-plan-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Contoh: Riwayat serah-terima per Feature"
            maxLength={200}
            required
          />
        </div>
        <div>
          <label
            htmlFor="feature-plan-idea"
            className="mb-1 block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            Ide Feature <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="feature-plan-idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={6}
            maxLength={5000}
            required
            placeholder="Ceritakan masalah yang ingin diselesaikan dan siapa penggunanya."
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#B1E743] dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
          />
        </div>
        <FolderLocationSelect
          folders={folders}
          value={folderId}
          onChange={setFolderId}
          label="Lokasi Folder"
          selectId="feature-plan-folder"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
