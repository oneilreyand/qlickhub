import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Play,
  ExternalLink,
  AlertCircle,
  Film,
  ZoomIn,
} from 'lucide-react';
import type { TaskAttachment, TaskLink } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { Skeleton } from '../../atoms/Skeleton';
import { Modal } from '../../molecules/Modal';
import { MediaLightboxModal } from '../../molecules/MediaLightboxModal';
import { attachmentService } from '../../../../lib/api/attachmentService';

export interface FeatureMediaGalleryProps {
  workspaceId: string;
  taskId: string;
  canManage: boolean;
  links?: TaskLink[];
}

const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const LOOM_REGEX = /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1';

function getAttachmentDownloadUrl(
  workspaceId: string,
  taskId: string,
  attachmentId: string,
): string {
  return `${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}/download`;
}

/**
 * Kompresi gambar di sisi browser menggunakan HTML Canvas
 * agar tetap berada di bawah batas body request Vercel (±4,5 MB).
 */
async function compressImageForUpload(file: File): Promise<{
  buffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
}> {
  // Bila ukuran <= 2 MB, unggah langsung tanpa kompresi
  if (file.size <= 2 * 1024 * 1024 || !file.type.startsWith('image/')) {
    const buffer = await file.arrayBuffer();
    return { buffer, fileName: file.name, mimeType: file.type || 'image/png' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1920;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const buffer = await blob.arrayBuffer();
              const newFileName = file.name.replace(/\.[^.]+$/, '.webp');
              resolve({
                buffer,
                fileName: newFileName,
                mimeType: 'image/webp',
              });
              return;
            }
            const buffer = await file.arrayBuffer();
            resolve({ buffer, fileName: file.name, mimeType: file.type || 'image/png' });
          },
          'image/webp',
          0.85,
        );
      } else {
        file
          .arrayBuffer()
          .then((buffer) =>
            resolve({ buffer, fileName: file.name, mimeType: file.type || 'image/png' }),
          );
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      file
        .arrayBuffer()
        .then((buffer) =>
          resolve({ buffer, fileName: file.name, mimeType: file.type || 'image/png' }),
        );
    };

    img.src = objectUrl;
  });
}

export const FeatureMediaGallery: React.FC<FeatureMediaGalleryProps> = ({
  workspaceId,
  taskId,
  canManage,
  links = [],
}) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion state
  const [deletingAttachment, setDeletingAttachment] = useState<TaskAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await attachmentService.listAttachments(workspaceId, taskId);
      // Filter exclusively for product_media attachments
      const mediaList = all.filter((a) => a.category === 'product_media');
      setAttachments(mediaList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat galeri media.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { buffer, fileName, mimeType } = await compressImageForUpload(file);
        await attachmentService.uploadAttachment(workspaceId, taskId, buffer, fileName, mimeType, {
          category: 'product_media',
        });
      }
      await loadMedia();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah gambar ke galeri.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!deletingAttachment) return;
    setIsDeleting(true);
    try {
      await attachmentService.deleteAttachment(workspaceId, taskId, deletingAttachment.id);
      setDeletingAttachment(null);
      await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus gambar.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract video links (YouTube, Loom, or links marked as video)
  const videoLinks = links.filter(
    (l) => l.linkType === 'video' || YOUTUBE_REGEX.test(l.url) || LOOM_REGEX.test(l.url),
  );

  return (
    <div className="space-y-4">
      {/* Header Galeri */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[#3F6212] dark:text-[#B1E743]" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Galeri Media & Video
          </h3>
          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400">
            {attachments.length + videoLinks.length}
          </span>
        </div>

        {canManage && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFileSelect(e)}
              disabled={isUploading}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5"
              data-testid="upload-media-button"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{isUploading ? 'Mengompresi & Mengunggah…' : 'Unggah Gambar'}</span>
            </Button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Daftar Video Tersemat (YouTube / Loom) */}
      {videoLinks.length > 0 && (
        <div className="space-y-3" data-testid="video-section">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-rose-500" />
            <span>Video Penjelasan Produk</span>
          </h4>

          <div className="grid gap-3 sm:grid-cols-2">
            {videoLinks.map((vLink) => {
              const ytMatch = vLink.url.match(YOUTUBE_REGEX);
              const loomMatch = vLink.url.match(LOOM_REGEX);

              if (ytMatch && ytMatch[1]) {
                const videoId = ytMatch[1];
                return (
                  <div
                    key={vLink.id}
                    className="overflow-hidden rounded-xl border border-stone-200 bg-black shadow-sm dark:border-stone-800"
                  >
                    <div className="relative aspect-video w-full">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                        title={vLink.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full border-0"
                      />
                    </div>
                    <div className="bg-stone-900 p-2 text-xs font-medium text-white truncate">
                      {vLink.title}
                    </div>
                  </div>
                );
              }

              if (loomMatch && loomMatch[1]) {
                const loomId = loomMatch[1];
                return (
                  <div
                    key={vLink.id}
                    className="overflow-hidden rounded-xl border border-stone-200 bg-black shadow-sm dark:border-stone-800"
                  >
                    <div className="relative aspect-video w-full">
                      <iframe
                        src={`https://www.loom.com/embed/${loomId}`}
                        title={vLink.title}
                        allowFullScreen
                        className="h-full w-full border-0"
                      />
                    </div>
                    <div className="bg-stone-900 p-2 text-xs font-medium text-white truncate">
                      {vLink.title}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={vLink.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-white dark:border-stone-800 dark:bg-stone-900"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Play className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {vLink.title}
                    </span>
                  </div>
                  <a
                    href={vLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#166534] hover:underline dark:text-[#B1E743] shrink-0"
                  >
                    <span>Putar Video</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Galeri Gambar */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="aspect-video w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : attachments.length === 0 && videoLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-5 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {canManage
              ? 'Belum ada gambar mockup atau media produk. Klik tombol Unggah Gambar di atas.'
              : 'Belum ada media gambar untuk Feature ini.'}
          </p>
        </div>
      ) : attachments.length > 0 ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          data-testid="images-grid"
        >
          {attachments.map((att) => {
            const downloadUrl = getAttachmentDownloadUrl(workspaceId, taskId, att.id);

            return (
              <div
                key={att.id}
                data-testid={`gallery-image-${att.id}`}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900"
              >
                <div
                  className="aspect-video w-full cursor-pointer overflow-hidden"
                  onClick={() => {
                    setLightboxSrc(downloadUrl);
                    setLightboxAlt(att.fileName);
                  }}
                  title="Klik untuk memperbesar gambar"
                >
                  <img
                    src={downloadUrl}
                    alt={att.fileName}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-900 shadow">
                      <ZoomIn className="h-3 w-3" />
                      Perbesar
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
                  <span className="truncate text-[11px] font-medium text-stone-700 dark:text-stone-300">
                    {att.fileName}
                  </span>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setDeletingAttachment(att)}
                      aria-label="Hapus gambar"
                      className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Lightbox Modal */}
      {lightboxSrc && (
        <MediaLightboxModal
          isOpen={Boolean(lightboxSrc)}
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* Modal Konfirmasi Hapus Gambar */}
      <Modal
        isOpen={Boolean(deletingAttachment)}
        onClose={() => setDeletingAttachment(null)}
        title="Hapus Gambar Galeri"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Apakah Anda yakin ingin menghapus gambar{' '}
            <strong className="text-stone-900 dark:text-stone-100">
              {deletingAttachment?.fileName}
            </strong>
            ?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingAttachment(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteAttachment()}
              disabled={isDeleting}
              data-testid="confirm-delete-attachment-button"
            >
              {isDeleting ? 'Menghapus…' : 'Hapus Gambar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
