import React, { useEffect, useState, useCallback } from 'react';
import {
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  Table,
  Video,
  Palette,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import type { TaskLink, TaskLinkType } from '@qlick/contracts';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Skeleton } from '../../atoms/Skeleton';
import { Modal } from '../../molecules/Modal';
import { taskLinkService } from '../../../../lib/api/taskLinkService';

export interface FeatureReferencesPanelProps {
  workspaceId: string;
  taskId: string;
  canManage: boolean;
  onLinksChange?: (links: TaskLink[]) => void;
}

const IMAGE_EXTENSION_REGEX = /\.(png|jpe?g|webp|svg|gif)($|\?|#)/i;
const YOUTUBE_REGEX = /(?:youtube\.com|youtu\.be)/i;
const LOOM_REGEX = /loom\.com/i;
const FIGMA_REGEX = /figma\.com/i;
const GOOGLE_DOC_REGEX = /docs\.google\.com\/document/i;
const GOOGLE_SHEET_REGEX = /docs\.google\.com\/spreadsheets/i;

function detectLinkType(url: string): TaskLinkType {
  if (IMAGE_EXTENSION_REGEX.test(url)) return 'image';
  if (FIGMA_REGEX.test(url)) return 'figma';
  if (YOUTUBE_REGEX.test(url) || LOOM_REGEX.test(url)) return 'video';
  if (GOOGLE_SHEET_REGEX.test(url)) return 'sheet';
  if (GOOGLE_DOC_REGEX.test(url)) return 'document';
  return 'other';
}

const LINK_TYPE_META: Record<
  TaskLinkType,
  { label: string; icon: React.FC<{ className?: string }>; badgeClass: string }
> = {
  figma: {
    label: 'Figma',
    icon: Palette,
    badgeClass:
      'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  image: {
    label: 'Gambar / Mockup',
    icon: ImageIcon,
    badgeClass:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  document: {
    label: 'Dokumen',
    icon: FileText,
    badgeClass:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  sheet: {
    label: 'Spreadsheet',
    icon: Table,
    badgeClass:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  video: {
    label: 'Video',
    icon: Video,
    badgeClass:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  other: {
    label: 'Tautan',
    icon: LinkIcon,
    badgeClass:
      'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700',
  },
};

function formatDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const FeatureReferencesPanel: React.FC<FeatureReferencesPanelProps> = ({
  workspaceId,
  taskId,
  canManage,
  onLinksChange,
}) => {
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<TaskLink | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState<TaskLinkType>('other');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deletingLink, setDeletingLink] = useState<TaskLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskLinkService.listLinks(workspaceId, taskId);
      setLinks(data);
      onLinksChange?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar tautan referensi.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, taskId, onLinksChange]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const handleOpenAddModal = () => {
    setEditingLink(null);
    setFormTitle('');
    setFormUrl('');
    setFormType('other');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (link: TaskLink) => {
    setEditingLink(link);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormType(link.linkType);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = formTitle.trim();
    const trimmedUrl = formUrl.trim();

    if (!trimmedTitle) {
      setFormError('Judul tautan wajib diisi.');
      return;
    }
    if (!trimmedUrl) {
      setFormError('URL tautan wajib diisi.');
      return;
    }
    if (!trimmedUrl.startsWith('https://')) {
      setFormError('Hanya tautan aman dengan protokol https:// yang diizinkan.');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setFormError('Format URL tidak valid.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingLink) {
        await taskLinkService.updateLink(workspaceId, taskId, editingLink.id, {
          title: trimmedTitle,
          url: trimmedUrl,
          linkType: formType,
        });
      } else {
        await taskLinkService.createLink(workspaceId, taskId, {
          title: trimmedTitle,
          url: trimmedUrl,
          linkType: formType,
        });
      }
      setIsModalOpen(false);
      await loadLinks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan tautan referensi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!deletingLink) return;
    setIsDeleting(true);
    try {
      await taskLinkService.deleteLink(workspaceId, taskId, deletingLink.id);
      setDeletingLink(null);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus tautan referensi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newLinks = [...links];
    const [moved] = newLinks.splice(index, 1);
    newLinks.splice(targetIndex, 0, moved);

    setLinks(newLinks);
    try {
      await taskLinkService.reorderLinks(
        workspaceId,
        taskId,
        newLinks.map((l) => l.id),
      );
      onLinksChange?.(newLinks);
    } catch (err) {
      await loadLinks();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-[#3F6212] dark:text-[#B1E743]" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Tautan Referensi
          </h3>
          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400">
            {links.length}
          </span>
        </div>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5"
            data-testid="add-link-button"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Tautan</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-5 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {canManage
              ? 'Belum ada tautan referensi. Tambahkan tautan Figma, dokumen PRD, spreadsheet, atau video.'
              : 'Belum ada tautan referensi untuk Feature ini.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2" data-testid="links-container">
          {links.map((link, idx) => {
            const meta = LINK_TYPE_META[link.linkType] || LINK_TYPE_META.other;
            const Icon = meta.icon;
            const domain = formatDomain(link.url);

            return (
              <div
                key={link.id}
                data-testid={`link-card-${link.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900/90 dark:hover:border-stone-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.badgeClass}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {link.title}
                      </h4>
                      <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                        {domain}
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-0.5 opacity-90 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => void handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Pindahkan ke atas"
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-20 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMoveOrder(idx, 'down')}
                        disabled={idx === links.length - 1}
                        aria-label="Pindahkan ke bawah"
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-20 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(link)}
                        aria-label="Sunting tautan"
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLink(link)}
                        aria-label="Hapus tautan"
                        className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5 dark:border-stone-800">
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`direct-redirect-link-${link.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#166534] hover:underline dark:text-[#B1E743]"
                  >
                    <span>Buka Tautan</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Tautan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLink ? 'Sunting Tautan Referensi' : 'Tambah Tautan Referensi'}
        size="md"
      >
        <form onSubmit={(e) => void handleSaveLink(e)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="link-title-input"
              className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Judul Referensi <span className="text-rose-500">*</span>
            </label>
            <Input
              id="link-title-input"
              data-testid="link-title-input"
              placeholder="Contoh: Desain Checkout Figma v2"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              maxLength={255}
              required
            />
          </div>

          <div>
            <label
              htmlFor="link-url-input"
              className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              URL Tautan (https://) <span className="text-rose-500">*</span>
            </label>
            <Input
              id="link-url-input"
              data-testid="link-url-input"
              type="url"
              placeholder="https://figma.com/file/..."
              value={formUrl}
              onChange={(e) => {
                const val = e.target.value;
                setFormUrl(val);
                if (!editingLink) {
                  const detected = detectLinkType(val);
                  if (detected !== 'other') {
                    setFormType(detected);
                  }
                }
              }}
              required
            />
          </div>

          <div>
            <label
              htmlFor="link-type-select"
              className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Jenis Referensi
            </label>
            <select
              id="link-type-select"
              data-testid="link-type-select"
              value={formType}
              onChange={(e) => setFormType(e.target.value as TaskLinkType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 transition focus:border-[#B1E743] focus:outline-none focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <option value="figma">Figma / Desain</option>
              <option value="image">Gambar / Mockup (URL)</option>
              <option value="document">Dokumen / Spesifikasi</option>
              <option value="sheet">Spreadsheet / Data</option>
              <option value="video">Video (YouTube / Loom / Drive)</option>
              <option value="other">Tautan Lainnya</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              data-testid="submit-link-button"
            >
              {isSaving ? 'Menyimpan…' : editingLink ? 'Simpan Perubahan' : 'Tambah Tautan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus Tautan */}
      <Modal
        isOpen={Boolean(deletingLink)}
        onClose={() => setDeletingLink(null)}
        title="Hapus Tautan Referensi"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Apakah Anda yakin ingin menghapus tautan{' '}
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
              onClick={() => void handleDeleteLink()}
              disabled={isDeleting}
              data-testid="confirm-delete-link-button"
            >
              {isDeleting ? 'Menghapus…' : 'Hapus Tautan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
