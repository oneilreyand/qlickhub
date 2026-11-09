import React, { useState } from 'react';
import { Image as ImageIcon, Play, ExternalLink, Film, ZoomIn, Trash2 } from 'lucide-react';
import type { TaskLink } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { Modal } from '../../molecules/Modal';
import { MediaLightboxModal } from '../../molecules/MediaLightboxModal';
import { taskLinkService } from '../../../../lib/api/taskLinkService';

export interface FeatureMediaGalleryProps {
  workspaceId: string;
  taskId: string;
  canManage: boolean;
  links?: TaskLink[];
  onLinksChange?: (links: TaskLink[]) => void;
}

const IMAGE_EXTENSION_REGEX = /\.(png|jpe?g|webp|svg|gif)($|\?|#)/i;
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const LOOM_REGEX = /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i;

export const FeatureMediaGallery: React.FC<FeatureMediaGalleryProps> = ({
  workspaceId,
  taskId,
  canManage,
  links = [],
  onLinksChange,
}) => {
  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  // Deletion modal state for link image
  const [deletingLink, setDeletingLink] = useState<TaskLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter links for image media (linkType === 'image' or URL has image extension)
  const imageLinks = links.filter(
    (l) => l.linkType === 'image' || IMAGE_EXTENSION_REGEX.test(l.url),
  );

  // Filter links for video media (linkType === 'video' or URL matches YouTube / Loom)
  const videoLinks = links.filter(
    (l) => l.linkType === 'video' || YOUTUBE_REGEX.test(l.url) || LOOM_REGEX.test(l.url),
  );

  const totalMedia = imageLinks.length + videoLinks.length;

  const handleDeleteImageLink = async () => {
    if (!deletingLink) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await taskLinkService.deleteLink(workspaceId, taskId, deletingLink.id);
      const remaining = links.filter((l) => l.id !== deletingLink.id);
      onLinksChange?.(remaining);
      setDeletingLink(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus tautan media.');
    } finally {
      setIsDeleting(false);
    }
  };

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
            {totalMedia}
          </span>
        </div>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {deleteError}
        </div>
      )}

      {/* Bagian Video (Bila Ada) */}
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
                    <div className="bg-stone-900 p-2 text-xs font-medium text-white truncate flex items-center justify-between gap-2">
                      <span className="truncate">{vLink.title}</span>
                      <a
                        href={vLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-white shrink-0 p-1"
                        title="Buka video di tab baru"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
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
                    <div className="bg-stone-900 p-2 text-xs font-medium text-white truncate flex items-center justify-between gap-2">
                      <span className="truncate">{vLink.title}</span>
                      <a
                        href={vLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-white shrink-0 p-1"
                        title="Buka video di tab baru"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
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

      {/* Grid Galeri Gambar (Murni dari Link/URL) */}
      {imageLinks.length === 0 && videoLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-5 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {canManage
              ? 'Belum ada media gambar atau video. Tambahkan tautan gambar (URL PNG, JPG, WebP) atau video pada bagian Tautan Referensi di atas.'
              : 'Belum ada media gambar atau video untuk Feature ini.'}
          </p>
        </div>
      ) : imageLinks.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>Gambar & Mockup Produk ({imageLinks.length})</span>
          </h4>

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
            data-testid="images-grid"
          >
            {imageLinks.map((iLink) => (
              <div
                key={iLink.id}
                data-testid={`gallery-image-${iLink.id}`}
                className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900"
              >
                <div
                  className="aspect-video w-full cursor-pointer overflow-hidden relative bg-stone-50 dark:bg-stone-950"
                  onClick={() => {
                    setLightboxSrc(iLink.url);
                    setLightboxAlt(iLink.title);
                  }}
                  title="Klik untuk memperbesar gambar"
                >
                  <img
                    src={iLink.url}
                    alt={iLink.title}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback placeholder bila image link broken
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-900 shadow">
                      <ZoomIn className="h-3 w-3" />
                      Perbesar
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 bg-white p-2.5 dark:border-stone-800 dark:bg-stone-900">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {iLink.title}
                    </p>
                    <a
                      href={iLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-stone-200"
                    >
                      <span>Buka URL</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setDeletingLink(iLink)}
                      aria-label={`Hapus gambar ${iLink.title}`}
                      className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Modal Lightbox Viewer */}
      <MediaLightboxModal
        isOpen={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
        src={lightboxSrc || ''}
        alt={lightboxAlt}
      />

      {/* Modal Konfirmasi Hapus Tautan Media */}
      <Modal
        isOpen={Boolean(deletingLink)}
        onClose={() => setDeletingLink(null)}
        title="Hapus Media Referensi"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Apakah Anda yakin ingin menghapus tautan media{' '}
            <strong className="text-stone-900 dark:text-stone-100">{deletingLink?.title}</strong>?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingLink(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteImageLink()}
              disabled={isDeleting}
              data-testid="confirm-delete-media-button"
            >
              {isDeleting ? 'Menghapus…' : 'Hapus Media'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
