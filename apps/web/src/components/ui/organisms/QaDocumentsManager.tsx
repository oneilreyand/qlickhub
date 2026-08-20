import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  History,
  Search,
  FileCode,
  ShieldCheck,
  Edit,
} from 'lucide-react';
import type {
  QaDocument,
  QaDocumentVersion,
} from '@qlick/contracts';
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

const docTypeMeta: Record<string, { label: string; icon: string; badgeClass: string }> = {
  test_plan: {
    label: 'Test Plan',
    icon: '🧪',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  },
  test_strategy: {
    label: 'Test Strategy',
    icon: '📋',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  },
  product_brief: {
    label: 'Product Brief',
    icon: '📑',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  },
  release_report: {
    label: 'Release Report',
    icon: '📊',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  },
  qa_guide: {
    label: 'QA Guide',
    icon: '📘',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  },
  default: {
    label: 'QA Document',
    icon: '📄',
    badgeClass: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700',
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
  const [newChangelog, setNewChangelog] = useState('Initial draft');
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
      setError(err instanceof Error ? err.message : 'Failed to load QA documents');
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
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to load document details', 'error'));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      dispatch(enqueueSnackbar('Title and content are required.', 'error'));
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const result = await qaDocumentService.createDocument(workspaceId, {
        title: newTitle.trim(),
        docType: newDocType,
        contentMarkdown: newContent,
        changelog: newChangelog.trim() || 'Initial version',
        folderId: folderId || null,
      });

      dispatch(enqueueSnackbar(`QA Document "${result.document.title}" created successfully.`, 'success'));
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewChangelog('Initial draft');
      await loadDocuments();
      setSelectedDocId(result.document.id);
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create QA document', 'error'));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !versionContent.trim()) {
      dispatch(enqueueSnackbar('Content is required for new version.', 'error'));
      return;
    }

    setIsSubmittingVersion(true);
    try {
      const result = await qaDocumentService.createDocumentVersion(workspaceId, selectedDocId, {
        contentMarkdown: versionContent,
        changelog: versionChangelog.trim() || `Version update`,
      });

      dispatch(enqueueSnackbar(`Created version v${result.version.version} successfully.`, 'success'));
      setIsVersionModalOpen(false);
      setVersionContent('');
      setVersionChangelog('');
      await loadDocDetails(selectedDocId);
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create new version', 'error'));
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
              <span>QA Test Documents & Plans</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {documents.length}
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {canManageDocs
                ? 'Create and version test plans, test strategies, and QA sign-off documents.'
                : 'Read-only access: Only QA Engineers, Admins, or Owners can create and edit QA documents.'}
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
            Create QA Document
          </Button>
        )}
      </div>

      {!canManageDocs && (
        <Alert tone="info" title="QA Document Permissions">
          You are viewing QA documents in read-only mode. Only <strong>QA Engineer, Admin, or Owner</strong> roles can create new documents and versions.
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
                placeholder="Search QA docs..."
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
              <option value="all">All Types</option>
              <option value="test_plan">🧪 Test Plan</option>
              <option value="test_strategy">📋 Test Strategy</option>
              <option value="product_brief">📑 Product Brief</option>
              <option value="release_report">📊 Release Report</option>
              <option value="qa_guide">📘 QA Guide</option>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : error ? (
            <Alert tone="error" title="Error loading QA documents">
              {error}
            </Alert>
          ) : filteredDocuments.length === 0 ? (
            <Card className="p-6 text-center space-y-2 border-dashed">
              <FileText className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                No QA documents found
              </p>
              {canManageDocs && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create Document
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredDocuments.map((doc) => {
                const meta = docTypeMeta[doc.docType || ''] || docTypeMeta.default;
                const isSelected = selectedDocId === doc.id;
                const isLinked = linkedDocumentIds.includes(doc.id);
                const versionNumber = typeof doc.currentVersion === 'number' ? doc.currentVersion : 1;

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
                        <span className="text-sm">{meta.icon}</span>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {doc.title}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass} shrink-0`}>
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
                          {isLinked ? 'Linked' : 'Link to Task'}
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
                    <span className="text-lg">
                      {docTypeMeta[selectedDocDetails.document.docType || '']?.icon || '📄'}
                    </span>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {selectedDocDetails.document.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Doc ID: <span className="font-mono">{selectedDocDetails.document.id.slice(0, 8)}</span> • Type: {docTypeMeta[selectedDocDetails.document.docType || '']?.label || 'QA Doc'}
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
                      New Version
                    </Button>
                  )}
                </div>
              </div>

              {/* Version Selector Bar */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-stone-500" />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Version:</span>
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
                    Created {new Date(activeVersion.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Markdown Content Display */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/40 max-h-[400px] overflow-y-auto">
                {activeVersion?.contentMarkdown ? (
                  <FormattedText content={activeVersion.contentMarkdown} />
                ) : (
                  <p className="text-xs text-stone-400 italic">No content in this version.</p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-stone-400">
              <FileCode className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-semibold">Select a QA document on the left to preview details.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Create QA Document Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create QA Document"
        description="Author a new test plan, strategy, or test scenario document."
        size="lg"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Document Title *
            </label>
            <Input
              required
              placeholder="e.g. End-to-End Payment Gateway Test Plan"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Document Type *
              </label>
              <Select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
              >
                <option value="test_plan">🧪 Test Plan</option>
                <option value="test_strategy">📋 Test Strategy</option>
                <option value="product_brief">📑 Product Brief</option>
                <option value="release_report">📊 Release Report</option>
                <option value="qa_guide">📘 QA Guide</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Initial Changelog
              </label>
              <Input
                placeholder="e.g. Initial draft"
                value={newChangelog}
                onChange={(e) => setNewChangelog(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Document Content (Markdown) *
            </label>
            <RichTextEditor
              id="new-doc-content"
              value={newContent}
              onChange={setNewContent}
              placeholder="Write test objectives, scope, test scenarios, prerequisites, and expected outcomes..."
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingCreate}
              disabled={!newTitle.trim() || !newContent.trim()}
            >
              Create Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Version Modal */}
      <Modal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        title={`New Version for ${selectedDocDetails?.document.title || 'Document'}`}
        description={`Publishing version v${(selectedDocDetails?.currentVersion?.version || 1) + 1}`}
        size="lg"
      >
        <form onSubmit={handleCreateVersion} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Changelog Notes *
            </label>
            <Input
              required
              placeholder="What changed in this revision? (e.g. Added edge case test scenarios)"
              value={versionChangelog}
              onChange={(e) => setVersionChangelog(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Updated Content (Markdown) *
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingVersion}
              disabled={!versionContent.trim()}
            >
              Publish New Version
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
