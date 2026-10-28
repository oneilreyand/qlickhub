import React from 'react';
import type { FolderTreeNode } from '@qlick/contracts';
import { Select } from '../atoms/Select';

interface FolderLocationSelectProps {
  folders: FolderTreeNode[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  label: string;
  selectId: string;
  ariaLabel?: string;
}

interface FlattenedFolder {
  id: string;
  name: string;
  depth: number;
}

const flattenFolders = (items: FolderTreeNode[], depth = 0): FlattenedFolder[] =>
  items.flatMap((item) => [
    { id: item.id, name: item.name, depth },
    ...(item.children ? flattenFolders(item.children, depth + 1) : []),
  ]);

/**
 * A consistent folder decision for every Feature creation surface.
 * Folderless Features remain valid root work, with an explicit path back to them in Task Hub.
 */
export const FolderLocationSelect: React.FC<FolderLocationSelectProps> = ({
  folders,
  value,
  onChange,
  label,
  selectId,
  ariaLabel,
}) => {
  const flatFolders = flattenFolders(folders);
  const helpId = `${selectId}-help`;

  return (
    <div>
      <label
        htmlFor={selectId}
        className="mb-1 block text-xs font-bold text-stone-700 dark:text-stone-300"
      >
        {label}
      </label>
      <Select
        id={selectId}
        value={value || ''}
        onChange={(event) => onChange(event.target.value || null)}
        aria-label={ariaLabel || label}
        aria-describedby={helpId}
      >
        <option value="">Tanpa Folder — tampil di Semua Task dan Tanpa Folder</option>
        {flatFolders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {'\u00A0'.repeat(folder.depth * 4)}
            {folder.name}
          </option>
        ))}
      </Select>
      <p id={helpId} className="mt-1.5 text-[11px] leading-4 text-stone-500 dark:text-stone-400">
        Pilih folder agar Feature mudah ditemukan pada navigasi workspace.
      </p>
    </div>
  );
};
