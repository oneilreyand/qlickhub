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
      title="Create & Link QA Document"
      description={`Author a new QA test plan or scenario document linked to "${taskTitle}"`}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Document Title *
          </label>
          <Input
            required
            placeholder="e.g. Test Plan: Payment Gateway Integration"
            value={docTitle}
            onChange={(e) => onDocTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Document Type *
          </label>
          <Select value={docType} onChange={(e) => onDocTypeChange(e.target.value)}>
            <option value="test_plan">Test Plan</option>
            <option value="test_strategy">Test Strategy</option>
            <option value="product_brief">Product Brief</option>
            <option value="release_report">Release Report</option>
            <option value="qa_guide">QA Guide</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            Document Content (Markdown) *
          </label>
          <RichTextEditor
            id="new-task-qa-doc-content"
            value={docContent}
            onChange={onDocContentChange}
            placeholder="Write test objectives, scope, test cases, and verification criteria..."
            minRows={8}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!docTitle.trim() || !docContent.trim()}
          >
            Create & Link Document
          </Button>
        </div>
      </form>
    </Modal>
  );
};
