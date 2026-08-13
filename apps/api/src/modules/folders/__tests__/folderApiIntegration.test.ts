import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { UserModel } from '../../../db/models/user.js';
import { folderService } from '../folderService.js';

describe('Folder Database & Service Robustness Tests (H3 & Pre-T1 Requirements)', () => {
  let user: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;

  before(async () => {
    // Create test user
    user = await UserModel.create({
      email: `test-folder-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Folder Test Admin',
      role: 'admin',
    });

    // Create test workspaces
    workspaceA = await WorkspaceModel.create({
      name: 'Workspace Alpha',
      slug: `ws-alpha-${Date.now()}`,
      ownerId: user.id,
    });

    workspaceB = await WorkspaceModel.create({
      name: 'Workspace Beta',
      slug: `ws-beta-${Date.now()}`,
      ownerId: user.id,
    });
  });

  after(async () => {
    // Clean up created records
    await WorkFolderModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await WorkspaceModel.destroy({ where: { id: [workspaceA.id, workspaceB.id] } });
    await UserModel.destroy({ where: { id: user.id } });
  });

  describe('1. Database-Level Parent Workspace Validation (Composite FK)', () => {
    test('Database rejects parent_folder_id belonging to a different workspace', async () => {
      // Create folder in Workspace A
      const parentInA = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Parent in Workspace A',
      });

      // Attempt raw DB insert of a child in Workspace B referencing parentInA (Workspace A)
      await assert.rejects(
        async () => {
          await WorkFolderModel.create({
            workspaceId: workspaceB.id, // Mismatched workspace!
            parentFolderId: parentInA.id,
            name: 'Cross-Workspace Child',
            position: 0,
            createdBy: user.id,
          });
        },
        (err: any) => {
          // Verify PostgreSQL foreign key constraint violation (fk_work_folders_parent_workspace)
          assert.strictEqual(err.name, 'SequelizeForeignKeyConstraintError');
          return true;
        }
      );
    });
  });

  describe('2. Unique Position per Sibling & Atomic Transaction', () => {
    test('Atomic creation assigns sequential positions for siblings', async () => {
      const folder1 = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Initiative 1',
      });

      const folder2 = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Initiative 2',
      });

      assert.strictEqual(folder2.position, folder1.position + 1);
    });

    test('Database unique index blocks duplicate active position in same parent/workspace', async () => {
      const topFolder = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Unique Test Top',
      });

      // Attempt raw DB insert with duplicate position in same parent
      await assert.rejects(
        async () => {
          await WorkFolderModel.create({
            workspaceId: workspaceA.id,
            parentFolderId: topFolder.id,
            name: 'Sub 1',
            position: 0,
            createdBy: user.id,
          });

          // Second insert with same workspace, parent, and position 0
          await WorkFolderModel.create({
            workspaceId: workspaceA.id,
            parentFolderId: topFolder.id,
            name: 'Sub 2 Duplicate Pos',
            position: 0,
            createdBy: user.id,
          });
        },
        (err: any) => {
          assert.strictEqual(err.name, 'SequelizeUniqueConstraintError');
          return true;
        }
      );
    });

    test('Reorders and reparents folders without violating active sibling positions', async () => {
      const first = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Reorder First',
      });
      const second = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Reorder Second',
      });
      const third = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Reorder Third',
      });

      await folderService.updateFolder(workspaceA.id, third.id, { position: 0 });
      const orderedRoots = await WorkFolderModel.findAll({
        where: { workspaceId: workspaceA.id, parentFolderId: null, archivedAt: null },
        order: [['position', 'ASC']],
      });
      assert.strictEqual(orderedRoots[0].id, third.id);
      assert.deepStrictEqual(orderedRoots.map((folder) => folder.position), orderedRoots.map((_, index) => index));

      await folderService.moveFolder(workspaceA.id, third.id, {
        parentFolderId: first.id,
        position: 0,
      });
      const orderedChildren = await WorkFolderModel.findAll({
        where: { workspaceId: workspaceA.id, parentFolderId: first.id, archivedAt: null },
        order: [['position', 'ASC']],
      });
      assert.strictEqual(orderedChildren[0].id, third.id);
      assert.deepStrictEqual(orderedChildren.map((folder) => folder.position), orderedChildren.map((_, index) => index));

      const remainingRoots = await WorkFolderModel.findAll({
        where: { workspaceId: workspaceA.id, parentFolderId: null, archivedAt: null },
        order: [['position', 'ASC']],
      });
      assert.ok(remainingRoots.some((folder) => folder.id === second.id));
      assert.deepStrictEqual(remainingRoots.map((folder) => folder.position), remainingRoots.map((_, index) => index));
    });
  });

  describe('3. Atomic Archiving & Unarchive Parent Check', () => {
    test('Archiving parent folder atomically archives child subfolders', async () => {
      const parent = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Release 2026.Q1',
      });

      const child = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        parentFolderId: parent.id,
        name: 'Feature Auth',
      });

      // Archive parent
      await folderService.archiveFolder(workspaceA.id, parent.id, true);

      // Verify child is also archived
      const childInDb = await WorkFolderModel.findByPk(child.id);
      assert.notStrictEqual(childInDb?.archivedAt, null);
    });

    test('Unarchiving child fails when parent is still archived', async () => {
      const parent = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Release 2026.Q2',
      });

      const child = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        parentFolderId: parent.id,
        name: 'Feature Billing',
      });

      // Archive parent (which archives child too)
      await folderService.archiveFolder(workspaceA.id, parent.id, true);

      // Attempt to unarchive ONLY the child
      await assert.rejects(
        async () => {
          await folderService.archiveFolder(workspaceA.id, child.id, false);
        },
        (err: Error) => {
          assert.ok(err.message.includes('Cannot unarchive child folder while its parent is archived'));
          return true;
        }
      );
    });
  });

  describe('4. Hard-Delete Restriction (FK RESTRICT)', () => {
    test('Hard deleting a parent folder with existing child subfolders is blocked by FK RESTRICT', async () => {
      const parent = await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        name: 'Parent For Hard Delete',
      });

      await folderService.createFolder(user.id, {
        workspaceId: workspaceA.id,
        parentFolderId: parent.id,
        name: 'Child For Hard Delete',
      });

      // Attempt raw DB destroy of parent folder while child exists
      await assert.rejects(
        async () => {
          await WorkFolderModel.destroy({ where: { id: parent.id } });
        },
        (err: any) => {
          assert.strictEqual(err.name, 'SequelizeForeignKeyConstraintError');
          return true;
        }
      );
    });
  });
});
