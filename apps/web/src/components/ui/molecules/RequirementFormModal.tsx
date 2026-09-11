import React, { useState, useEffect } from 'react';
import { Requirement, RequirementStatus } from '@qlick/contracts';
import { Modal } from './Modal';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Alert } from '../atoms/Alert';
import { RichTextEditor } from './RichTextEditor';
import { Link, Hash } from 'lucide-react';

export interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    code?: string;
    title: string;
    description?: string | null;
    url?: string | null;
    status?: RequirementStatus;
  }) => Promise<void>;
  onSaveAndPlan?: RequirementFormModalProps['onSave'];
  initialData?: Partial<Requirement> | null;
  suggestedCode?: string;
  title?: string;
  isSaving?: boolean;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndPlan,
  initialData,
  suggestedCode,
  title = initialData ? 'Ubah Requirement' : 'Buat Requirement',
  isSaving = false,
}) => {
  const [code, setCode] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RequirementStatus>('active');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode(initialData?.code || suggestedCode || '');
      setReqTitle(initialData?.title || '');
      setUrl(initialData?.url || '');
      setDescription(initialData?.description || '');
      setStatus(initialData?.status || 'active');
      setValidationError(null);
    }
  }, [isOpen, initialData, suggestedCode]);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) return true;
    try {
      new URL(value.trim());
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (saveAction = onSave) => {
    setValidationError(null);
    const trimmedTitle = reqTitle.trim();
    if (!trimmedTitle) {
      setValidationError('Judul Requirement wajib diisi.');
      return;
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl && !validateUrl(trimmedUrl)) {
      setValidationError(
        'Masukkan URL yang valid (termasuk http:// atau https://), atau kosongkan kolom ini.',
      );
      return;
    }

    try {
      await saveAction({
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        title: trimmedTitle,
        description: description.trim() ? description.trim() : initialData ? null : undefined,
        url: trimmedUrl ? trimmedUrl : initialData ? null : undefined,
        status: initialData ? status : undefined,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Requirement gagal disimpan.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={
        initialData
          ? 'Perbarui detail, sumber referensi, atau status Requirement.'
          : 'Buat Requirement yang terstruktur dan tautkan sumber spesifiknya bila diperlukan.'
      }
      primaryActionLabel={
        !initialData && onSaveAndPlan
          ? 'Buat & Rencanakan Subtask'
          : initialData
            ? 'Perbarui Requirement'
            : 'Buat Requirement'
      }
      onPrimaryAction={() =>
        void handleSubmit(onSaveAndPlan && !initialData ? onSaveAndPlan : onSave)
      }
      additionalActionLabel={!initialData && onSaveAndPlan ? 'Buat Requirement' : undefined}
      onAdditionalAction={() => void handleSubmit(onSave)}
      secondaryActionLabel="Batal"
      isPrimaryLoading={isSaving}
      size="lg"
    >
      <div className="space-y-4">
        {validationError && <Alert tone="error">{validationError}</Alert>}

        <Input
          label="Judul Requirement *"
          placeholder="Contoh: Spesifikasi Modal Checkout & Penggunaan Kupon"
          value={reqTitle}
          onChange={(e) => setReqTitle(e.target.value)}
          disabled={isSaving}
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="requirement-code"
            label={
              suggestedCode && !initialData
                ? 'Kode Requirement (Saran)'
                : 'Kode Requirement (Opsional)'
            }
            placeholder="Contoh: REQ-101 (dibuat otomatis jika kosong)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isSaving}
            leftIcon={<Hash className="h-4 w-4" />}
            aria-describedby={
              suggestedCode && !initialData ? 'requirement-code-guidance' : undefined
            }
          />

          {suggestedCode && !initialData && (
            <p
              id="requirement-code-guidance"
              className="self-center text-xs text-stone-500 dark:text-stone-400"
            >
              Disarankan dari kode Requirement yang terhubung ke Task ini. Anda dapat mengubahnya
              sebelum menyimpan.
            </p>
          )}

          {initialData && (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RequirementStatus)}
              disabled={isSaving}
            >
              <option value="draft">Draf</option>
              <option value="active">Aktif</option>
              <option value="deprecated">Tidak Berlaku</option>
            </Select>
          )}
        </div>

        <Input
          label="URL Sumber / Referensi (Opsional)"
          placeholder="Tautan langsung ke bagian PRD, Figma, kebijakan, atau spesifikasi teknis"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isSaving}
          leftIcon={<Link className="h-4 w-4" />}
        />

        <RichTextEditor
          id="requirement-description"
          label="Deskripsi Lengkap (Opsional)"
          placeholder="Kebutuhan bisnis, aturan, perilaku, batasan, atau edge case..."
          minRows={8}
          value={description}
          onChange={setDescription}
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
};
