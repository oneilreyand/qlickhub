import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  canCreateWorkspace,
  hasWorkspaceRole,
  isWorkspaceAdminOrOwner,
} from '../workspacePolicy.js';

describe('Workspace Policy Unit Tests', () => {
  test('isWorkspaceAdminOrOwner identifies owner and admin correctly', () => {
    assert.strictEqual(isWorkspaceAdminOrOwner('owner'), true);
    assert.strictEqual(isWorkspaceAdminOrOwner('admin'), true);
    assert.strictEqual(isWorkspaceAdminOrOwner('dev'), false);
    assert.strictEqual(isWorkspaceAdminOrOwner('qa'), false);
    assert.strictEqual(isWorkspaceAdminOrOwner('po'), false);
  });

  test('hasWorkspaceRole evaluates permitted roles', () => {
    assert.strictEqual(hasWorkspaceRole('owner', ['owner', 'admin']), true);
    assert.strictEqual(hasWorkspaceRole('dev', ['owner', 'admin']), false);
    assert.strictEqual(hasWorkspaceRole('qa', ['qa', 'dev', 'po']), true);
  });

  test('workspace creation allows owner, admin, and po but blocks qa and dev', () => {
    assert.strictEqual(canCreateWorkspace('owner'), true);
    assert.strictEqual(canCreateWorkspace('admin'), true);
    assert.strictEqual(canCreateWorkspace('po'), true);
    assert.strictEqual(canCreateWorkspace('qa'), false);
    assert.strictEqual(canCreateWorkspace('dev'), false);
    assert.strictEqual(canCreateWorkspace('viewer'), false);
  });
});
