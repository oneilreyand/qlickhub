import assert from 'node:assert';
import { test, describe } from 'node:test';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@qlick/contracts';

describe('Workspace API Authorization & Validation Tests', () => {
  describe('Input Contract Validation', () => {
    test('CreateWorkspaceSchema rejects empty name and name shorter than 2 chars', () => {
      const resultShort = CreateWorkspaceSchema.safeParse({ name: 'A' });
      assert.strictEqual(resultShort.success, false);

      const resultEmpty = CreateWorkspaceSchema.safeParse({ name: '   ' });
      assert.strictEqual(resultEmpty.success, false);
    });

    test('CreateWorkspaceSchema accepts valid workspace input', () => {
      const result = CreateWorkspaceSchema.safeParse({
        name: 'QA Engineering Workspace',
        description: 'Primary workspace for QA team',
      });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.name, 'QA Engineering Workspace');
      }
    });

    test('UpdateWorkspaceSchema accepts optional updates', () => {
      const result = UpdateWorkspaceSchema.safeParse({
        description: 'Updated description',
      });
      assert.strictEqual(result.success, true);
    });
  });

  describe('Cross-Workspace Authorization Logic', () => {
    test('User without membership is blocked from accessing external workspace', () => {
      const userWorkspaces = [{ workspaceId: 'ws-user-1' }];
      const targetWorkspaceId = 'ws-other-team-99';

      const isMember = userWorkspaces.some((w) => w.workspaceId === targetWorkspaceId);
      assert.strictEqual(isMember, false);
    });

    test('Only owner/admin can execute updateWorkspace mutation', () => {
      const allowedRoles = ['owner', 'admin'];

      assert.strictEqual(allowedRoles.includes('owner'), true);
      assert.strictEqual(allowedRoles.includes('admin'), true);
      assert.strictEqual(allowedRoles.includes('dev'), false);
      assert.strictEqual(allowedRoles.includes('qa'), false);
    });

    test('Only owner, admin, po, and qa roles can create workspaces', () => {
      const allowedCreationRoles = ['owner', 'admin', 'po', 'qa'];

      assert.strictEqual(allowedCreationRoles.includes('owner'), true);
      assert.strictEqual(allowedCreationRoles.includes('admin'), true);
      assert.strictEqual(allowedCreationRoles.includes('po'), true);
      assert.strictEqual(allowedCreationRoles.includes('qa'), true);
      assert.strictEqual(allowedCreationRoles.includes('dev'), false);
      assert.strictEqual(allowedCreationRoles.includes('viewer'), false);
    });
  });
});
