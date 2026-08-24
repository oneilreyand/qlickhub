import { Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { WorkFolderModel } from '../../db/models/workFolder.js';
import { FolderActivityModel } from '../../db/models/folderActivity.js';
import {
  CreateFolderInput,
  UpdateFolderInput,
  MoveFolderInput,
  FolderTreeNode,
  Folder,
} from '@qlick/contracts';

function formatFolder(f: WorkFolderModel): Folder {
  const json = f.toJSON();
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    parentFolderId: json.parentFolderId || null,
    name: json.name,
    position: json.position,
    createdBy: json.createdBy,
    archivedAt: json.archivedAt ? new Date(json.archivedAt).toISOString() : null,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function clampPosition(position: number, collectionLength: number): number {
  return Math.max(0, Math.min(position, collectionLength));
}

async function getLockedActiveFolders(
  workspaceId: string,
  transaction: Transaction,
): Promise<WorkFolderModel[]> {
  return WorkFolderModel.findAll({
    where: { workspaceId, archivedAt: null },
    order: [
      ['parentFolderId', 'ASC'],
      ['position', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

function getTemporaryStart(folders: WorkFolderModel[]): number {
  return Math.min(0, ...folders.map((folder) => folder.position)) - folders.length - 1;
}

async function stageFolderOrder(
  folders: WorkFolderModel[],
  transaction: Transaction,
): Promise<void> {
  // Positions are unique among active siblings. Use temporary negative values first so
  // PostgreSQL never sees two active folders with the same final position mid-update.
  const temporaryStart = getTemporaryStart(folders);
  for (const [index, folder] of folders.entries()) {
    folder.position = temporaryStart + index;
    await folder.save({ transaction });
  }
}

async function finalizeFolderOrder(
  folders: WorkFolderModel[],
  transaction: Transaction,
): Promise<void> {
  for (const [index, folder] of folders.entries()) {
    folder.position = index;
    await folder.save({ transaction });
  }
}

async function persistFolderOrder(
  folders: WorkFolderModel[],
  transaction: Transaction,
): Promise<void> {
  await stageFolderOrder(folders, transaction);
  await finalizeFolderOrder(folders, transaction);
}

function activeSiblings(
  folders: WorkFolderModel[],
  parentFolderId: string | null,
): WorkFolderModel[] {
  return folders.filter((candidate) => candidate.parentFolderId === parentFolderId);
}

export class FolderService {
  /**
   * Fetches 2-level folder tree for a workspace.
   */
  async getFolderTree(workspaceId: string, includeArchived = false): Promise<FolderTreeNode[]> {
    const whereClause: Record<string, unknown> = { workspaceId };
    if (!includeArchived) {
      whereClause.archivedAt = null;
    }

    const folders = await WorkFolderModel.findAll({
      where: whereClause,
      order: [
        ['position', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    folders.forEach((f) => {
      const formatted = formatFolder(f);
      const node: FolderTreeNode = {
        ...formatted,
        children: [],
      };
      folderMap.set(f.id, node);
    });

    folders.forEach((f) => {
      const node = folderMap.get(f.id)!;
      if (f.parentFolderId && folderMap.has(f.parentFolderId)) {
        const parent = folderMap.get(f.parentFolderId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else if (!f.parentFolderId) {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  }

  /**
   * Creates a folder enforcing workspace ownership, same-workspace parent, max 2 levels depth,
   * unique sibling positions, and atomic transaction execution.
   */
  async createFolder(userId: string, input: CreateFolderInput): Promise<Folder> {
    const { workspaceId, parentFolderId, name } = input;

    return await sequelize.transaction(async (transaction) => {
      if (parentFolderId) {
        const parentFolder = await WorkFolderModel.findOne({
          where: { id: parentFolderId },
          transaction,
        });
        if (!parentFolder) {
          throw new Error('NOT_FOUND: Parent folder not found.');
        }
        if (parentFolder.workspaceId !== workspaceId) {
          throw new Error('BAD_REQUEST: Parent folder belongs to a different workspace.');
        }
        if (parentFolder.parentFolderId !== null) {
          throw new Error(
            'BAD_REQUEST: Maximum two persisted folder levels allowed below a workspace.',
          );
        }
        if (parentFolder.archivedAt !== null) {
          throw new Error('BAD_REQUEST: Cannot create a subfolder in an archived folder.');
        }
      }

      const parentCondition = parentFolderId || null;
      const activeFolders = await getLockedActiveFolders(workspaceId, transaction);
      const siblings = activeSiblings(activeFolders, parentCondition);
      const position = clampPosition(input.position ?? siblings.length, siblings.length);

      const folder = await WorkFolderModel.create(
        {
          workspaceId,
          parentFolderId: parentCondition,
          name,
          // The final value is assigned by persistFolderOrder after the new sibling
          // has been inserted into the in-memory ordering.
          position: -1,
          createdBy: userId,
        },
        { transaction },
      );

      siblings.splice(position, 0, folder);
      await persistFolderOrder(siblings, transaction);

      await FolderActivityModel.create(
        {
          workspaceId,
          folderId: folder.id,
          actorId: userId,
          action: 'created',
          metadataJson: { name: folder.name, parentFolderId: folder.parentFolderId },
        },
        { transaction },
      );

      return formatFolder(folder);
    });
  }

  /**
   * Updates folder name or position within an atomic transaction.
   */
  async updateFolder(
    workspaceId: string,
    folderId: string,
    input: UpdateFolderInput,
  ): Promise<Folder> {
    return await sequelize.transaction(async (transaction) => {
      const folder = await WorkFolderModel.findOne({
        where: { id: folderId, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!folder) {
        throw new Error('NOT_FOUND: Folder not found in this workspace.');
      }

      if (input.position !== undefined && input.position !== folder.position) {
        if (folder.archivedAt !== null) {
          folder.position = input.position;
          if (input.name !== undefined) folder.name = input.name;
          await folder.save({ transaction });

          await FolderActivityModel.create(
            {
              workspaceId,
              folderId: folder.id,
              actorId: null,
              action: 'updated',
              metadataJson: { name: folder.name, position: folder.position },
            },
            { transaction },
          );

          return formatFolder(folder);
        }

        const activeFolders = await getLockedActiveFolders(workspaceId, transaction);
        const siblings = activeSiblings(activeFolders, folder.parentFolderId);
        const orderedFolder = siblings.find((sibling) => sibling.id === folderId);

        if (!orderedFolder) {
          throw new Error('NOT_FOUND: Active folder not found in this workspace.');
        }

        const currentIndex = siblings.findIndex((sibling) => sibling.id === folderId);
        siblings.splice(currentIndex, 1);
        siblings.splice(clampPosition(input.position, siblings.length), 0, orderedFolder);
        if (input.name !== undefined) orderedFolder.name = input.name;
        await persistFolderOrder(siblings, transaction);

        await FolderActivityModel.create(
          {
            workspaceId,
            folderId: orderedFolder.id,
            actorId: null,
            action: 'updated',
            metadataJson: { name: orderedFolder.name, position: orderedFolder.position },
          },
          { transaction },
        );

        return formatFolder(orderedFolder);
      }

      if (input.name !== undefined) folder.name = input.name;
      await folder.save({ transaction });

      await FolderActivityModel.create(
        {
          workspaceId,
          folderId: folder.id,
          actorId: null,
          action: 'updated',
          metadataJson: { name: folder.name, position: folder.position },
        },
        { transaction },
      );

      return formatFolder(folder);
    });
  }

  /**
   * Moves a folder (re-parents or re-orders), enforcing hierarchy constraints and atomic transactions.
   */
  async moveFolder(workspaceId: string, folderId: string, input: MoveFolderInput): Promise<Folder> {
    return await sequelize.transaction(async (transaction) => {
      const folder = await WorkFolderModel.findOne({
        where: { id: folderId, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!folder) {
        throw new Error('NOT_FOUND: Folder not found in this workspace.');
      }

      const targetParentId = input.parentFolderId || null;

      if (targetParentId) {
        if (targetParentId === folderId) {
          throw new Error('BAD_REQUEST: A folder cannot be set as its own parent.');
        }

        const targetParent = await WorkFolderModel.findOne({
          where: { id: targetParentId },
          transaction,
        });
        if (!targetParent) {
          throw new Error('NOT_FOUND: Target parent folder not found.');
        }

        if (targetParent.workspaceId !== workspaceId) {
          throw new Error('BAD_REQUEST: Target parent folder belongs to a different workspace.');
        }

        if (targetParent.parentFolderId !== null) {
          throw new Error(
            'BAD_REQUEST: Maximum two persisted folder levels allowed below a workspace.',
          );
        }

        if (targetParent.archivedAt !== null) {
          throw new Error('BAD_REQUEST: Cannot move a folder into an archived parent folder.');
        }

        // Check if folder being moved has children
        const childCount = await WorkFolderModel.count({
          where: { parentFolderId: folderId, workspaceId },
          transaction,
        });

        if (childCount > 0) {
          throw new Error('BAD_REQUEST: Cannot move a folder with subfolders into another folder.');
        }
      }

      if (folder.archivedAt !== null) {
        folder.parentFolderId = targetParentId;
        folder.position = input.position;
        await folder.save({ transaction });
        return formatFolder(folder);
      }

      const activeFolders = await getLockedActiveFolders(workspaceId, transaction);
      const orderedFolder = activeFolders.find((candidate) => candidate.id === folderId);
      if (!orderedFolder) {
        throw new Error('NOT_FOUND: Active folder not found in this workspace.');
      }

      const sourceParentId = orderedFolder.parentFolderId;
      const sourceSiblings = activeSiblings(activeFolders, sourceParentId);

      if (sourceParentId === targetParentId) {
        const currentIndex = sourceSiblings.findIndex((sibling) => sibling.id === folderId);
        sourceSiblings.splice(currentIndex, 1);
        sourceSiblings.splice(
          clampPosition(input.position, sourceSiblings.length),
          0,
          orderedFolder,
        );
        await persistFolderOrder(sourceSiblings, transaction);
        return formatFolder(orderedFolder);
      }

      const remainingSourceSiblings = sourceSiblings.filter((sibling) => sibling.id !== folderId);
      const targetSiblings = activeSiblings(activeFolders, targetParentId);
      orderedFolder.parentFolderId = targetParentId;
      targetSiblings.splice(clampPosition(input.position, targetSiblings.length), 0, orderedFolder);

      // Stage the destination first so the moved folder leaves its source sibling
      // group before any source folder receives its final position.
      await stageFolderOrder(targetSiblings, transaction);
      await stageFolderOrder(remainingSourceSiblings, transaction);
      await finalizeFolderOrder(remainingSourceSiblings, transaction);
      await finalizeFolderOrder(targetSiblings, transaction);

      await FolderActivityModel.create(
        {
          workspaceId,
          folderId: orderedFolder.id,
          actorId: null,
          action: 'moved',
          metadataJson: { parentFolderId: targetParentId, position: input.position },
        },
        { transaction },
      );

      return formatFolder(orderedFolder);
    });
  }

  /**
   * Archives or unarchives a folder atomically.
   * Enforces that child subfolders cannot be unarchived while their parent is archived.
   */
  async archiveFolder(workspaceId: string, folderId: string, archive = true): Promise<Folder> {
    return await sequelize.transaction(async (transaction) => {
      const folder = await WorkFolderModel.findOne({
        where: { id: folderId, workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!folder) {
        throw new Error('NOT_FOUND: Folder not found in this workspace.');
      }

      if (!archive && folder.parentFolderId) {
        // Check if parent folder is archived before allowing unarchive of child
        const parentFolder = await WorkFolderModel.findOne({
          where: { id: folder.parentFolderId, workspaceId },
          transaction,
        });
        if (parentFolder && parentFolder.archivedAt !== null) {
          throw new Error(
            'BAD_REQUEST: Cannot unarchive child folder while its parent is archived. Unarchive the parent folder first.',
          );
        }
      }

      if (archive) {
        const archivedAt = new Date();
        folder.archivedAt = archivedAt;
        await folder.save({ transaction });

        // If archiving a parent folder, archive all children as well in the same transaction.
        await WorkFolderModel.update(
          { archivedAt },
          {
            where: { parentFolderId: folderId, workspaceId },
            transaction,
          },
        );

        const activeFolders = await getLockedActiveFolders(workspaceId, transaction);
        await persistFolderOrder(activeSiblings(activeFolders, folder.parentFolderId), transaction);

        await FolderActivityModel.create(
          {
            workspaceId,
            folderId: folder.id,
            actorId: null,
            action: 'archived',
            metadataJson: null,
          },
          { transaction },
        );
      } else {
        if (folder.archivedAt === null) {
          return formatFolder(folder);
        }

        const activeFolders = await getLockedActiveFolders(workspaceId, transaction);
        const siblings = activeSiblings(activeFolders, folder.parentFolderId);
        const nextPosition = siblings.length;

        folder.archivedAt = null;
        folder.position = nextPosition;
        await folder.save({ transaction });

        await FolderActivityModel.create(
          {
            workspaceId,
            folderId: folder.id,
            actorId: null,
            action: 'unarchived',
            metadataJson: null,
          },
          { transaction },
        );
      }

      return formatFolder(folder);
    });
  }
}

export const folderService = new FolderService();
