import React, { useState, useEffect } from 'react';
import { Requirement, RequirementStatus } from '@qlick/contracts';
import { Modal } from './Modal';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Select } from '../atoms/Select';
import { Alert } from '../atoms/Alert';
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
  initialData?: Partial<Requirement> | null;
  title?: string;
  isSaving?: boolean;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = initialData ? 'Edit Requirement' : 'Create Requirement',
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
      setCode(initialData?.code || '');
      setReqTitle(initialData?.title || '');
      setUrl(initialData?.url || '');
      setDescription(initialData?.description || '');
      setStatus(initialData?.status || 'active');
      setValidationError(null);
    }
  }, [isOpen, initialData]);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) return true;
    try {
      new URL(value.trim());
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setValidationError(null);
    const trimmedTitle = reqTitle.trim();
    if (!trimmedTitle) {
      setValidationError('Requirement title is required.');
      return;
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl && !validateUrl(trimmedUrl)) {
      setValidationError(
        'Please enter a valid URL (including http:// or https://) or leave it blank.',
      );
      return;
    }

    try {
      await onSave({
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        title: trimmedTitle,
        description: description.trim() ? description.trim() : initialData ? null : undefined,
        url: trimmedUrl ? trimmedUrl : initialData ? null : undefined,
        status: initialData ? status : undefined,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save requirement.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={
        initialData
          ? 'Update the requirement details, external reference, or status.'
          : 'Define a structured requirement or embed an optional external design/spec reference.'
      }
      primaryActionLabel={initialData ? 'Update Requirement' : 'Create Requirement'}
      onPrimaryAction={handleSubmit}
      secondaryActionLabel="Cancel"
      isPrimaryLoading={isSaving}
      size="lg"
    >
      <div className="space-y-4">
        {validationError && <Alert tone="error">{validationError}</Alert>}

        <Input
          label="Requirement Title *"
          placeholder="e.g. Checkout Modal & Coupon Application Spec"
          value={reqTitle}
          onChange={(e) => setReqTitle(e.target.value)}
          disabled={isSaving}
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Requirement Code (Optional)"
            placeholder="e.g. REQ-101 (Auto-generated if empty)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isSaving}
            leftIcon={<Hash className="h-4 w-4" />}
          />

          {initialData && (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RequirementStatus)}
              disabled={isSaving}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </Select>
          )}
        </div>

        <Input
          label="External Reference URL (Optional)"
          placeholder="e.g. https://www.figma.com/file/... or https://docs.google.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isSaving}
          leftIcon={<Link className="h-4 w-4" />}
        />

        <Textarea
          label="Detailed Description (Optional)"
          placeholder="Summary of business rules, UI behaviors, or edge cases..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
};
