import assert from 'node:assert';
import { test, describe } from 'node:test';
import { WorkFolderModel } from '../workFolder.js';

describe('WorkFolder Model Unit Tests', () => {
  test('WorkFolderModel defines expected table structure and fields', () => {
    assert.strictEqual(WorkFolderModel.tableName, 'work_folders');
    assert.ok(WorkFolderModel.rawAttributes.id);
    assert.ok(WorkFolderModel.rawAttributes.workspaceId);
    assert.ok(WorkFolderModel.rawAttributes.parentFolderId);
    assert.ok(WorkFolderModel.rawAttributes.name);
    assert.ok(WorkFolderModel.rawAttributes.position);
    assert.ok(WorkFolderModel.rawAttributes.createdBy);
    assert.ok(WorkFolderModel.rawAttributes.archivedAt);
  });
});
