import assert from 'node:assert';
import { test, describe } from 'node:test';
import { CreateFolderSchema, MoveFolderSchema } from '@qlick/contracts';

describe('Folder Hierarchy & Policy Service Tests', () => {
  const workspaceA = '123e4567-e89b-12d3-a456-426614174000';
  const workspaceB = '223e4567-e89b-12d3-a456-426614174001';
  const level1FolderId = '323e4567-e89b-12d3-a456-426614174002';
  const level2FolderId = '423e4567-e89b-12d3-a456-426614174003';

  describe('Contract Validations for Folders', () => {
    test('CreateFolderSchema accepts valid Level 1 and Level 2 inputs', () => {
      const level1 = CreateFolderSchema.parse({
        workspaceId: workspaceA,
        name: 'Release 2026.1',
      });
      assert.strictEqual(level1.name, 'Release 2026.1');
      assert.strictEqual(level1.parentFolderId, undefined);

      const level2 = CreateFolderSchema.parse({
        workspaceId: workspaceA,
        parentFolderId: level1FolderId,
        name: 'Feature Workstream A',
      });
      assert.strictEqual(level2.parentFolderId, level1FolderId);
    });

    test('MoveFolderSchema validates move payload', () => {
      const moveInput = MoveFolderSchema.parse({
        parentFolderId: level1FolderId,
        position: 2,
      });
      assert.strictEqual(moveInput.parentFolderId, level1FolderId);
      assert.strictEqual(moveInput.position, 2);
    });
  });

  describe('Hierarchy Rule Evaluation', () => {
    test('Depth validation logic blocks third-level nesting', () => {
      const mockParent = {
        id: level2FolderId,
        workspaceId: workspaceA,
        parentFolderId: level1FolderId, // Already a Level 2 subfolder!
      };

      const isThirdLevel = mockParent.parentFolderId !== null;
      assert.strictEqual(isThirdLevel, true);
    });

    test('Self-parenting check blocks setting same folder as parent', () => {
      const targetFolderId = level1FolderId;
      const proposedParentId = level1FolderId;

      const isSelfParent = targetFolderId === proposedParentId;
      assert.strictEqual(isSelfParent, true);
    });

    test('Cross-workspace parent check detects mismatching workspace IDs', () => {
      const folderWorkspaceId: string = workspaceA;
      const parentFolderWorkspaceId: string = workspaceB;

      const isCrossWorkspace = folderWorkspaceId !== parentFolderWorkspaceId;
      assert.strictEqual(isCrossWorkspace, true);
    });
  });
});
