import React, { useState } from 'react';
import type { FeatureSpec } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { featureSpecService } from '../../../lib/api/featureSpecService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';

export interface FeatureSpecCreateModalProps {
  isOpen: boolean;
  workspaceId: string | null | undefined;
  folderId?: string | null;
  onClose: () => void;
  onCreated: (spec: FeatureSpec) => void;
}

/** Entri satu langkah "Tulis ide" (AC-5.1): judul + ide membuat Feature dan Feature Spec versi 1. */
export const FeatureSpecCreateModal: React.FC<FeatureSpecCreateModalProps> = ({
  isOpen,
  workspaceId,
  folderId,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = Boolean(workspaceId) && title.trim().length > 0 && idea.trim().length > 0;

  const handleSubmit = async () => {
    if (!workspaceId || !canSubmit) return;
    setIsSaving(true);
    try {
      const spec = await featureSpecService.create(workspaceId, {
        title: title.trim(),
        idea: idea.trim(),
        folderId: folderId ?? null,
      });
      setTitle('');
      setIdea('');
      onCreated(spec);
    } catch (error) {
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'Ide gagal disimpan', 'error'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tulis ide Feature"
      description="Tulis judul dan ide singkat. Plan lengkapnya diisi di langkah berikutnya."
      primaryActionLabel="Simpan dan lanjut"
      onPrimaryAction={() => void handleSubmit()}
      isPrimaryLoading={isSaving}
      isPrimaryDisabled={!canSubmit}
      secondaryActionLabel="Batal"
    >
      <div className="space-y-4">
        <Input
          label="Judul Feature"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          label="Ide awal"
          rows={5}
          maxLength={5000}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
        />
      </div>
    </Modal>
  );
};
