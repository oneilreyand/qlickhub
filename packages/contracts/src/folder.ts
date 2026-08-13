import { z } from 'zod';

/**
 * Base Folder entity schema.
 * Note: Folders allow a maximum depth of two persisted levels below Workspace:
 * Level 1: Initiative / Release (parentFolderId is null/undefined)
 * Level 2: Feature / Workstream (parentFolderId points to Level 1 folder)
 */
export const FolderSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  parentFolderId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Folder name is required').max(100),
  position: z.number().int().min(0),
  createdBy: z.string().uuid(),
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Folder = z.infer<typeof FolderSchema>;

/**
 * Input schema for creating a folder.
 */
export const CreateFolderSchema = z.object({
  workspaceId: z.string().uuid(),
  parentFolderId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Folder name is required').max(100),
  position: z.number().int().min(0).optional(),
});

export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;

/**
 * Input schema for updating folder details.
 */
export const UpdateFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(100).optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;

/**
 * Input schema for moving/reordering a folder.
 */
export const MoveFolderSchema = z.object({
  parentFolderId: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0),
});

export type MoveFolderInput = z.infer<typeof MoveFolderSchema>;

/**
 * Input schema for archiving/unarchiving a folder.
 */
export const ArchiveFolderSchema = z.object({
  archive: z.boolean().default(true),
});

export type ArchiveFolderInput = z.infer<typeof ArchiveFolderSchema>;

/**
 * Folder tree node schema for representing the 2-level hierarchy.
 */
export type FolderTreeNode = Folder & {
  children?: Folder[];
};

export const FolderTreeNodeSchema: z.ZodType<FolderTreeNode> = z.lazy(() =>
  FolderSchema.extend({
    children: z.array(FolderSchema).optional(),
  })
);

export const FolderTreeResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  folders: z.array(FolderTreeNodeSchema),
});

export type FolderTreeResponse = z.infer<typeof FolderTreeResponseSchema>;

export const FolderListResponseSchema = z.object({
  folders: z.array(FolderSchema),
});

export type FolderListResponse = z.infer<typeof FolderListResponseSchema>;
