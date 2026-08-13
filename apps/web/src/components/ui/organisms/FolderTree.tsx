import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { FolderTreeNode, WorkspaceRole } from '@qa/contracts';
import { IconButton } from '../atoms/IconButton';
import { Button } from '../atoms/Button';
import { Skeleton } from '../atoms/Skeleton';
import { Modal } from '../molecules/Modal';
import { Input } from '../atoms/Input';

interface FolderTreeProps {
  folders: FolderTreeNode[];
  selectedFolderId: string | null;
  totalTasks?: number;
  isLoading?: boolean;
  error?: string | null;
  userRole?: WorkspaceRole;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentFolderId?: string) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onArchiveFolder: (folderId: string) => Promise<void>;
  onRetry?: () => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  totalTasks = 0,
  isLoading = false,
  error = null,
  userRole,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onArchiveFolder,
  onRetry,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const [parentFolderForNew, setParentFolderForNew] = useState<string | undefined>();
  const [folderNameInput, setFolderNameInput] = useState('');
  const [targetFolder, setTargetFolder] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageFolders = userRole ? ['owner', 'admin', 'po'].includes(userRole) : true;

  const toggleExpand = (folderId: string) => {
    setExpanded((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleOpenCreateModal = (parentId?: string) => {
    setParentFolderForNew(parentId);
    setFolderNameInput('');
    setCreateModalOpen(true);
  };

  const handleOpenRenameModal = (folder: { id: string; name: string }) => {
    setTargetFolder(folder);
    setFolderNameInput(folder.name);
    setRenameModalOpen(true);
  };

  const handleOpenArchiveModal = (folder: { id: string; name: string }) => {
    setTargetFolder(folder);
    setArchiveModalOpen(true);
  };

  const submitCreate = async () => {
    if (!folderNameInput.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateFolder(folderNameInput.trim(), parentFolderForNew);
      setCreateModalOpen(false);
      setFolderNameInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRename = async () => {
    if (!targetFolder || !folderNameInput.trim()) return;
    setIsSubmitting(true);
    try {
      await onRenameFolder(targetFolder.id, folderNameInput.trim());
      setRenameModalOpen(false);
      setTargetFolder(null);
      setFolderNameInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitArchive = async () => {
    if (!targetFolder) return;
    setIsSubmitting(true);
    try {
      await onArchiveFolder(targetFolder.id);
      setArchiveModalOpen(false);
      setTargetFolder(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <nav className="space-y-2" aria-label="Folder hierarchy tree">
      {/* Header Controls */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2.5 dark:border-stone-800">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Folders
        </span>
        {canManageFolders && (
          <Button
            onClick={() => handleOpenCreateModal()}
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] px-2 text-stone-900 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New Folder
          </Button>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2 py-1" role="status" aria-label="Loading folders">
          <span className="sr-only">Loading folders</span>
          <Skeleton variant="rectangular" className="h-9 w-full rounded-xl" />
          <Skeleton variant="rectangular" className="h-9 w-full rounded-xl" />
          <Skeleton variant="rectangular" className="h-9 w-full rounded-xl" />
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>Failed to load folders</span>
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="h-7 text-[11px] w-full border-rose-200 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300"
              leftIcon={<RefreshCw className="h-3 w-3" />}
            >
              Retry
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* All Folders Entry */}
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-semibold transition-colors ${
              selectedFolderId === null
                ? 'bg-[#22201F] text-white font-bold dark:bg-[#B1E743] dark:text-[#22201F]'
                : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <FolderOpen className={`h-4 w-4 ${selectedFolderId === null ? 'text-[#B1E743] dark:text-[#22201F]' : 'text-stone-500'}`} />
              <span>All Tasks</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedFolderId === null ? 'bg-stone-700 text-white dark:bg-stone-900 dark:text-stone-100' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
              {totalTasks}
            </span>
          </button>

          {/* Empty Folder Tree State */}
          {folders.length === 0 ? (
            <div className="py-6 text-center space-y-2 border border-dashed border-stone-200 rounded-xl p-4 dark:border-stone-800">
              <FolderPlus className="h-6 w-6 text-stone-300 mx-auto dark:text-stone-600" />
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                No folders created yet.
              </p>
              {canManageFolders && (
                <Button
                  onClick={() => handleOpenCreateModal()}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Initiative
                </Button>
              )}
            </div>
          ) : (
            /* Folder Tree List */
            <div className="space-y-1">
              {folders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                const isExpanded = !!expanded[folder.id];
                const hasChildren = folder.children && folder.children.length > 0;

                return (
                  <div key={folder.id} className="space-y-1">
                    {/* Level 1 Folder Row */}
                    <div className="group flex items-center justify-between rounded-xl px-1.5 hover:bg-stone-100 dark:hover:bg-stone-800/60">
                      <button
                        type="button"
                        onClick={() => onSelectFolder(folder.id)}
                        className={`flex min-h-10 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#22201F] font-bold text-white dark:bg-[#B1E743] dark:text-[#22201F]'
                            : 'text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <Folder className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#B1E743] dark:text-[#22201F]' : 'text-amber-500'}`} />
                        <span className="truncate">{folder.name}</span>
                      </button>

                      <div className="flex items-center gap-0.5">
                        {canManageFolders && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                            {/* Add Subfolder Action */}
                            <IconButton
                              onClick={() => handleOpenCreateModal(folder.id)}
                              label={`Add subfolder to ${folder.name}`}
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </IconButton>

                            {/* Rename Action */}
                            <IconButton
                              onClick={() => handleOpenRenameModal(folder)}
                              label={`Rename ${folder.name}`}
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </IconButton>

                            {/* Archive Action */}
                            <IconButton
                              onClick={() => handleOpenArchiveModal(folder)}
                              label={`Archive ${folder.name}`}
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        )}

                        {hasChildren && (
                          <IconButton
                            onClick={() => toggleExpand(folder.id)}
                            label={`${isExpanded ? 'Collapse' : 'Expand'} ${folder.name}`}
                            aria-expanded={isExpanded}
                            aria-controls={`folder-children-${folder.id}`}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 text-stone-400"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </IconButton>
                        )}
                      </div>
                    </div>

                    {/* Level 2 Subfolder Rows */}
                    {hasChildren && isExpanded && (
                      <div
                        id={`folder-children-${folder.id}`}
                        className="ml-4 space-y-1 border-l-2 border-stone-100 pl-2 dark:border-stone-800"
                      >
                        {folder.children!.map((subfolder) => {
                          const isSubSelected = selectedFolderId === subfolder.id;
                          return (
                            <div
                              key={subfolder.id}
                              className="group/sub flex items-center justify-between rounded-lg px-1.5 hover:bg-stone-100 dark:hover:bg-stone-800/60"
                            >
                              <button
                                type="button"
                                onClick={() => onSelectFolder(subfolder.id)}
                                className={`flex min-h-8 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs transition-colors ${
                                  isSubSelected
                                    ? 'bg-[#22201F] font-semibold text-white dark:bg-[#B1E743] dark:text-[#22201F]'
                                    : 'text-stone-600 dark:text-stone-400'
                                }`}
                              >
                                <span className="truncate">{subfolder.name}</span>
                              </button>

                              {canManageFolders && (
                                <div className="opacity-0 group-hover/sub:opacity-100 flex items-center transition-opacity">
                                  <IconButton
                                    onClick={() => handleOpenRenameModal(subfolder)}
                                    label={`Rename ${subfolder.name}`}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 text-stone-400 hover:text-stone-900"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => handleOpenArchiveModal(subfolder)}
                                    label={`Archive ${subfolder.name}`}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 text-stone-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </IconButton>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Create Folder / Subfolder */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={parentFolderForNew ? 'Create New Subfolder (Level 2)' : 'Create New Folder (Level 1)'}
        description={
          parentFolderForNew
            ? 'Add a Feature or Workstream subfolder.'
            : 'Add an Initiative or Release top-level folder.'
        }
        primaryActionLabel="Create Folder"
        secondaryActionLabel="Cancel"
        onPrimaryAction={submitCreate}
        isPrimaryLoading={isSubmitting}
      >
        <Input
          label="Folder Name"
          type="text"
          value={folderNameInput}
          onChange={(e) => setFolderNameInput(e.target.value)}
          placeholder={parentFolderForNew ? 'e.g. Workstream Checkout' : 'e.g. Release 2026.1'}
          required
          autoFocus
        />
      </Modal>

      {/* Modal: Rename Folder */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title={`Rename "${targetFolder?.name || 'Folder'}"`}
        primaryActionLabel="Save Name"
        secondaryActionLabel="Cancel"
        onPrimaryAction={submitRename}
        isPrimaryLoading={isSubmitting}
      >
        <Input
          label="New Folder Name"
          type="text"
          value={folderNameInput}
          onChange={(e) => setFolderNameInput(e.target.value)}
          required
          autoFocus
        />
      </Modal>

      {/* Modal: Archive Folder Confirmation */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title={`Archive "${targetFolder?.name || 'Folder'}"?`}
        description="Archiving this folder will hide it from the active workspace tree along with any child subfolders."
        primaryActionLabel="Archive Folder"
        secondaryActionLabel="Cancel"
        onPrimaryAction={submitArchive}
        isPrimaryLoading={isSubmitting}
      >
        <p className="text-xs text-stone-500 dark:text-stone-400">
          This action will archive the folder. You can unarchive it later if needed.
        </p>
      </Modal>
    </nav>
  );
};
