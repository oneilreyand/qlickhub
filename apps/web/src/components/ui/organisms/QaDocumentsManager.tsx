import React, { useState, useEffect } from 'react';
import { FileText, Plus, History, Search, FileCode, ShieldCheck, Edit } from 'lucide-react';
import type { QaDocument, QaDocumentVersion } from '@qlick/contracts';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Skeleton } from '../atoms/Skeleton';
import { Alert } from '../atoms/Alert';
import { FormattedText } from '../atoms/FormattedText';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { Modal } from '../molecules/Modal';
import { qaDocumentService } from '../../../lib/api/qaDocumentService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';

export interface QaDocumentsManagerProps {
  workspaceId: string;
  userRole?: string;
  folderId?: string;
  onDocumentLinked?: (doc: QaDocument) => void;
  linkedDocumentIds?: string[];
  onLinkToggle?: (documentId: string, isLinked: boolean) => void;
  isDrawerMode?: boolean;
}

const docTypeMeta: Record<string, { label: string; badgeClass: string }> = {
  test_plan: {
    label: 'Rencana Pengujian',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  },
  test_strategy: {
    label: 'Strategi Pengujian',
    badgeClass:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  },
  product_brief: {
    label: 'Ringkasan Produk',
    badgeClass:
      'bg-[#B1E743]/20 text-[#141413] dark:bg-[#B1E743]/20 dark:text-[#B1E743] border border-[#B1E743]/40 dark:border-[#B1E743]/40',
  },
  release_report: {
    label: 'Laporan Rilis',
    badgeClass:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  },
  qa_guide: {
    label: 'Panduan QA',
    badgeClass:
      'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  },
  default: {
    label: 'Dokumen QA',
    badgeClass:
      'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700',
  },
};

export const QaDocumentsManager: React.FC<QaDocumentsManagerProps> = ({
  workspaceId,
  userRole = 'qa',
  folderId,
  linkedDocumentIds = [],
  onLinkToggle,
  isDrawerMode = false,
}) => {
  const dispatch = useAppDispatch();
  const normalizedRole = (userRole || '').toLowerCase();
  const canManageDocs = ['owner', 'admin', 'qa'].includes(normalizedRole);

  const [documents, setDocuments] = useState<QaDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocDetails, setSelectedDocDetails] = useState<{
    document: QaDocument;
    versions: QaDocumentVersion[];
    currentVersion: QaDocumentVersion;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Search & Type Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Create Document Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDocType, setNewDocType] = useState('test_plan');
  const [newContent, setNewContent] = useState('');
  const [newChangelog, setNewChangelog] = useState('Draf awal');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Create Version Modal State
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionContent, setVersionContent] = useState('');
  const [versionChangelog, setVersionChangelog] = useState('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);

  const loadDocuments = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const docs = await qaDocumentService.listWorkspaceDocuments(workspaceId, folderId);
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokumen QA gagal dimuat');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [workspaceId, folderId]);

  useEffect(() => {
    if (selectedDocId && workspaceId) {
      loadDocDetails(selectedDocId);
    } else {
      setSelectedDocDetails(null);
    }
  }, [selectedDocId, workspaceId]);

  const loadDocDetails = async (docId: string) => {
    setIsLoadingDetails(true);
    try {
      const details = await qaDocumentService.getDocumentDetails(workspaceId, docId);
      setSelectedDocDetails(details);
      setSelectedVersionId(details.currentVersion?.id || null);
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Detail dokumen gagal dimuat',
          'error',
        ),
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      dispatch(enqueueSnackbar('Judul dan isi wajib diisi.', 'error'));
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const result = await qaDocumentService.createDocument(workspaceId, {
        title: newTitle.trim(),
        docType: newDocType,
        contentMarkdown: newContent,
        changelog: newChangelog.trim() || 'Versi awal',
        folderId: folderId || null,
      });

      dispatch(
        enqueueSnackbar(`Dokumen QA "${result.document.title}" berhasil dibuat.`, 'success'),
      );
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewChangelog('Draf awal');
      await loadDocuments();
      setSelectedDocId(result.document.id);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Dokumen QA gagal dibuat', 'error'),
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !versionContent.trim()) {
      dispatch(enqueueSnackbar('Konten wajib diisi untuk versi baru.', 'error'));
      return;
    }

    setIsSubmittingVersion(true);
    try {
      const result = await qaDocumentService.createDocumentVersion(workspaceId, selectedDocId, {
        contentMarkdown: versionContent,
        changelog: versionChangelog.trim() || `Pembaruan versi`,
      });

      dispatch(enqueueSnackbar(`Versi v${result.version.version} berhasil dibuat.`, 'success'));
      setIsVersionModalOpen(false);
      setVersionContent('');
      setVersionChangelog('');
      await loadDocDetails(selectedDocId);
    } catch (err) {
      dispatch(
        enqueueSnackbar(err instanceof Error ? err.message : 'Versi baru gagal dibuat', 'error'),
      );
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  const openNewVersionModal = () => {
    if (!selectedDocDetails) return;
    setVersionContent(selectedDocDetails.currentVersion?.contentMarkdown || '');
    setVersionChangelog(`Changes for v${(selectedDocDetails.currentVersion?.version || 1) + 1}`);
    setIsVersionModalOpen(true);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.docType === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeVersion =
    selectedDocDetails?.versions.find((v) => v.id === selectedVersionId) ||
    selectedDocDetails?.currentVersion;

  return (
    <div className={`space-y-4 ${isDrawerMode ? 'p-1' : ''}`}>
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Dokumen &amp; Rencana Pengujian QA</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {documents.length}
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {canManageDocs
                ? 'Buat dan kelola versi rencana pengujian, strategi pengujian, serta dokumen persetujuan QA.'
                : 'Akses hanya baca: hanya QA Engineer, Admin, atau Owner yang dapat membuat dan mengedit dokumen QA.'}
            </p>
          </div>
        </div>

        {canManageDocs && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Buat Dokumen QA
          </Button>
        )}
      </div>

      {!canManageDocs && (
        <Alert tone="info" title="Izin Dokumen QA">
          Anda melihat dokumen QA dalam mode hanya baca. Hanya peran{' '}
          <strong>QA Engineer, Admin, atau Owner</strong> yang dapat membuat dokumen dan versi baru.
        </Alert>
      )}

      {/* Main Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Document List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <Input
                placeholder="Cari dokumen QA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs h-9 w-36"
            >
              <option value="all">Semua Jenis</option>
              <option value="test_plan">Rencana Pengujian</option>
              <option value="test_strategy">Strategi Pengujian</option>
              <option value="product_brief">Ringkasan Produk</option>
              <option value="release_report">Laporan Rilis</option>
              <option value="qa_guide">Panduan QA</option>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : error ? (
            <Alert tone="error" title="Dokumen QA gagal dimuat">
              {error}
            </Alert>
          ) : filteredDocuments.length === 0 ? (
            <Card className="p-6 text-center space-y-2 border-dashed">
              <FileText className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Dokumen QA belum ditemukan
              </p>
              {canManageDocs && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Buat Dokumen
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredDocuments.map((doc) => {
                const meta = docTypeMeta[doc.docType || ''] || docTypeMeta.default;
                const isSelected = selectedDocId === doc.id;
                const isLinked = linkedDocumentIds.includes(doc.id);
                const versionNumber =
                  typeof doc.currentVersion === 'number' ? doc.currentVersion : 1;

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/30 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {doc.title}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass} shrink-0`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span className="font-mono">v{versionNumber}</span>
                      {onLinkToggle && canManageDocs && (
                        <Button
                          size="sm"
                          variant={isLinked ? 'outline' : 'ghost'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onLinkToggle(doc.id, !isLinked);
                          }}
                          className={`text-[10px] h-6 px-2 ${
                            isLinked ? 'border-emerald-500 text-emerald-600' : ''
                          }`}
                        >
                          {isLinked ? 'Tertaut' : 'Tautkan ke Task'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Document Details & Version Preview */}
        <div className="lg:col-span-7">
          {isLoadingDetails ? (
            <Card className="p-6 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </Card>
          ) : selectedDocDetails ? (
            <Card className="p-5 space-y-4 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {selectedDocDetails.document.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Doc ID:{' '}
                    <span className="font-mono">{selectedDocDetails.document.id.slice(0, 8)}</span>{' '}
                    • Type:{' '}
                    {docTypeMeta[selectedDocDetails.document.docType || '']?.label || 'QA Doc'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canManageDocs && (
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Edit className="h-3 w-3" />}
                      onClick={openNewVersionModal}
                    >
                      Versi Baru
                    </Button>
                  )}
                </div>
              </div>

              {/* Version Selector Bar */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-stone-500" />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Versi:</span>
                  <Select
                    value={selectedVersionId || ''}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="text-xs h-7 py-0 px-2 w-32"
                  >
                    {(selectedDocDetails.versions || []).map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version} {v.changelog ? `(${v.changelog})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                {activeVersion && (
                  <span className="text-[11px] text-stone-500">
                    Dibuat {new Date(activeVersion.createdAt).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>

              {/* Markdown Content Display */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/40 max-h-[400px] overflow-y-auto">
                {activeVersion?.contentMarkdown ? (
                  <FormattedText content={activeVersion.contentMarkdown} />
                ) : (
                  <p className="text-xs text-stone-400 italic">Versi ini belum memiliki isi.</p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-stone-400">
              <FileCode className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-semibold">
                Pilih dokumen QA di sebelah kiri untuk melihat detail.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Create QA Document Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Buat Dokumen QA"
        description="Buat dokumen rencana pengujian, strategi, atau skenario pengujian baru."
        size="lg"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Judul Dokumen *
            </label>
            <Input
              required
              placeholder="Contoh: Rencana Pengujian End-to-End Payment Gateway"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Jenis Dokumen *
              </label>
              <Select value={newDocType} onChange={(e) => setNewDocType(e.target.value)}>
                <option value="test_plan">Rencana Pengujian</option>
                <option value="test_strategy">Strategi Pengujian</option>
                <option value="product_brief">Ringkasan Produk</option>
                <option value="release_report">Laporan Rilis</option>
                <option value="qa_guide">Panduan QA</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Catatan Perubahan Awal
              </label>
              <Input
                placeholder="Contoh: Draf awal"
                value={newChangelog}
                onChange={(e) => setNewChangelog(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Konten Dokumen (Markdown) *
            </label>
            <RichTextEditor
              id="new-doc-content"
              value={newContent}
              onChange={setNewContent}
              placeholder="Tulis tujuan dan cakupan pengujian, skenario, prasyarat, serta hasil yang diharapkan..."
              minRows={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingCreate}
              disabled={!newTitle.trim() || !newContent.trim()}
            >
              Buat Dokumen
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Version Modal */}
      <Modal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        title={`Versi Baru untuk ${selectedDocDetails?.document.title || 'Dokumen'}`}
        description={`Menerbitkan versi v${(selectedDocDetails?.currentVersion?.version || 1) + 1}`}
        size="lg"
      >
        <form onSubmit={handleCreateVersion} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Catatan Perubahan *
            </label>
            <Input
              required
              placeholder="Apa yang berubah pada revisi ini? (contoh: menambahkan skenario edge case)"
              value={versionChangelog}
              onChange={(e) => setVersionChangelog(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Konten Terbaru (Markdown) *
            </label>
            <RichTextEditor
              id="version-doc-content"
              value={versionContent}
              onChange={setVersionContent}
              minRows={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsVersionModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingVersion}
              disabled={!versionContent.trim()}
            >
              Terbitkan Versi Baru
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
