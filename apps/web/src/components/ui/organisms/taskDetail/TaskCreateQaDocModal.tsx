import React from 'react';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { RichTextEditor } from '../../molecules/RichTextEditor';

export interface TaskCreateQaDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  docTitle: string;
  onDocTitleChange: (title: string) => void;
  docType: string;
  onDocTypeChange: (type: string) => void;
  docContent: string;
  onDocContentChange: (content: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const TaskCreateQaDocModal: React.FC<TaskCreateQaDocModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  docTitle,
  onDocTitleChange,
  docType,
  onDocTypeChange,
  docContent,
  onDocContentChange,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat & Tautkan Dokumen QA"
      description={`Buat rencana pengujian atau dokumen skenario QA yang tertaut ke "${taskTitle}"`}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Document Title *
          </label>
          <Input
            required
            placeholder="Contoh: Rencana Pengujian Payment Gateway"
            value={docTitle}
            onChange={(e) => onDocTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Document Type *
          </label>
          <Select value={docType} onChange={(e) => onDocTypeChange(e.target.value)}>
            <option value="test_plan">Rencana Pengujian</option>
            <option value="test_strategy">Strategi Pengujian</option>
            <option value="product_brief">Ringkasan Produk</option>
            <option value="release_report">Laporan Rilis</option>
            <option value="qa_guide">Panduan QA</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Konten Dokumen (Markdown) *
          </label>
          <RichTextEditor
            id="new-task-qa-doc-content"
            value={docContent}
            onChange={onDocContentChange}
            placeholder="Tulis tujuan dan cakupan pengujian, Test Case, serta kriteria verifikasi..."
            minRows={8}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!docTitle.trim() || !docContent.trim()}
          >
            Buat & Tautkan Dokumen
          </Button>
        </div>
      </form>
    </Modal>
  );
};
