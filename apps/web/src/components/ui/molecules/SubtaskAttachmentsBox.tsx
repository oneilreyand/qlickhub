import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Upload,
  File,
  Download,
  Trash2,
  Eye,
  Plus,
} from 'lucide-react';
import type { TaskAttachment, AttachmentCategory } from '@qlick/contracts';
import { attachmentService } from '../../../lib/api/attachmentService';
import { ImageLightboxModal } from './ImageLightboxModal';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';

export interface SubtaskAttachmentsBoxProps {
  workspaceId: string;
  subtaskId: string;
  attachments: TaskAttachment[];
  onAttachmentUploaded: (newAttachment: TaskAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  canUpload?: boolean;
  defaultCategory?: AttachmentCategory;
}

export const SubtaskAttachmentsBox: React.FC<SubtaskAttachmentsBoxProps> = ({
  workspaceId,
  subtaskId,
  attachments,
  onAttachmentUploaded,
  onAttachmentDeleted,
  canUpload = true,
  defaultCategory = 'qa_evidence',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const [uploadCategory, setUploadCategory] = useState<AttachmentCategory>(defaultCategory);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const isImageMime = (mime: string) => mime.startsWith('image/');

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const newAtt = await attachmentService.uploadAttachment(
        workspaceId,
        subtaskId,
        buffer,
        file.name,
        file.type,
        {
          category: uploadCategory,
          caption: caption.trim() || undefined,
        }
      );
      onAttachmentUploaded(newAtt);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to upload subtask attachment', err);
      dispatch(enqueueSnackbar('Failed to upload attachment', 'error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    setDeletingId(attId);
    try {
      await attachmentService.deleteAttachment(workspaceId, subtaskId, attId);
      onAttachmentDeleted(attId);
    } catch (err) {
      console.error('Failed to delete subtask attachment', err);
      dispatch(enqueueSnackbar('Failed to delete attachment', 'error'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-stone-400" />
          <span>Evidence, Screenshots & Files ({attachments.length})</span>
        </span>

        {canUpload && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] text-stone-600 hover:text-indigo-600 dark:text-stone-400 dark:hover:text-indigo-400"
            leftIcon={<Plus className="h-3 w-3" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Upload Attachment
          </Button>
        )}
      </div>

      {/* Category selector pills */}
      {canUpload && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] text-stone-500 font-medium">Category:</span>
          {(['qa_evidence', 'product_media', 'general'] as AttachmentCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setUploadCategory(cat)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                uploadCategory === cat
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              {cat === 'qa_evidence' ? 'QA Evidence' : cat === 'product_media' ? 'Design / Media' : 'General'}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        accept="image/*,.pdf,.zip,.log,.txt,.json"
      />

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
          <LoadingSpinner size="sm" />
          <span>Uploading attachment...</span>
        </div>
      )}

      {/* Attachments Grid / List */}
      {attachments.length === 0 ? (
        <div
          onClick={() => canUpload && fileInputRef.current?.click()}
          className={`p-4 text-center rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/40 transition-colors ${
            canUpload ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-stone-50/60 dark:hover:bg-stone-900/60' : ''
          }`}
        >
          <Upload className="h-5 w-5 text-stone-400 mx-auto mb-1" />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {canUpload
              ? 'Click to upload screenshot, error log, or evidence files'
              : 'No attachments uploaded for this subtask.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((att) => {
            const isImage = isImageMime(att.mimeType);
            const downloadUrl = attachmentService.getDownloadUrl(workspaceId, subtaskId, att.id);

            return (
              <div
                key={att.id}
                className="group relative flex items-center gap-3 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 transition-all"
              >
                {/* Thumbnail / File Icon */}
                <div
                  className={`h-12 w-12 rounded-lg shrink-0 overflow-hidden border border-stone-200 dark:border-stone-800 flex items-center justify-center ${
                    isImage ? 'cursor-pointer bg-stone-100 dark:bg-stone-800' : 'bg-stone-50 dark:bg-stone-950'
                  }`}
                  onClick={() => {
                    if (isImage) {
                      setSelectedImage({ src: downloadUrl, alt: att.fileName });
                    }
                  }}
                >
                  {isImage ? (
                    <img
                      src={downloadUrl}
                      alt={att.fileName}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <File className="h-5 w-5 text-stone-400" />
                  )}
                </div>

                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate block">
                      {att.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    <span>{formatFileSize(att.fileSize)}</span>
                    <span>•</span>
                    <span className="uppercase text-[9px] font-bold px-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {att.category === 'qa_evidence'
                        ? 'QA'
                        : att.category === 'product_media'
                        ? 'MEDIA'
                        : 'DOC'}
                    </span>
                  </div>
                  {att.caption && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 italic truncate mt-0.5">
                      {att.caption}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isImage && (
                    <IconButton
                      label="View preview"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedImage({ src: downloadUrl, alt: att.fileName })}
                    >
                      <Eye className="h-3.5 w-3.5 text-stone-500" />
                    </IconButton>
                  )}
                  <a
                    href={downloadUrl}
                    download={att.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Download file"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {canUpload && (
                    <IconButton
                      label="Delete attachment"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(att.id)}
                      disabled={deletingId === att.id}
                      className="hover:text-rose-600"
                    >
                      {deletingId === att.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      )}
                    </IconButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <ImageLightboxModal
          isOpen={Boolean(selectedImage)}
          src={selectedImage.src}
          alt={selectedImage.alt}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};
