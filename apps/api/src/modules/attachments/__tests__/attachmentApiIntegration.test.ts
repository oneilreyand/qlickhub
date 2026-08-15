import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  TaskModel,
  TaskAttachmentModel,
  TaskActivityModel,
} from '../../../db/models/index.js';

describe('Attachment API & Evidence Storage Integration Tests', () => {
  let userA: UserModel;
  let userB: UserModel;
  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let task1: TaskModel;

  before(async () => {
    await sequelize.authenticate();

    // Create test users
    userA = await UserModel.create({
      email: `owner_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Owner User',
    });

    userB = await UserModel.create({
      email: `other_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Other Workspace User',
    });

    // Create workspaces
    workspace1 = await WorkspaceModel.create({
      name: 'Workspace One',
      slug: `workspace-one-${Date.now()}`,
      ownerId: userA.id,
    });

    workspace2 = await WorkspaceModel.create({
      name: 'Workspace Two',
      slug: `workspace-two-${Date.now()}`,
      ownerId: userB.id,
    });

    // Membership
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: userA.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: userB.id,
      role: 'owner',
    });

    // Task
    task1 = await TaskModel.create({
      workspaceId: workspace1.id,
      title: 'Task with Evidence',
      status: 'todo',
      priority: 'medium',
      reporterId: userA.id,
    });
  });

  after(async () => {
    // Cleanup test data
    if (task1) await TaskAttachmentModel.destroy({ where: { taskId: task1.id } });
    if (task1) await TaskActivityModel.destroy({ where: { taskId: task1.id } });
    if (task1) await TaskModel.destroy({ where: { id: task1.id } });
    if (workspace1) await WorkspaceModel.destroy({ where: { id: workspace1.id } });
    if (workspace2) await WorkspaceModel.destroy({ where: { id: workspace2.id } });
    if (userA) await UserModel.destroy({ where: { id: userA.id } });
    if (userB) await UserModel.destroy({ where: { id: userB.id } });
  });

  test('Upload attachment directly creates record, saves file, and logs TaskActivity in transaction', async () => {
    const fileContent = Buffer.from('FAKE_SCREENSHOT_BINARY_DATA');

    // Simulate upload via service directly for test consistency
    const { attachmentService } = await import('../attachmentService.js');
    const attachment = await attachmentService.uploadAttachment(
      workspace1.id,
      task1.id,
      userA.id,
      {
        buffer: fileContent,
        originalname: 'test_evidence.png',
        mimetype: 'image/png',
        size: fileContent.length,
        category: 'product_media',
        caption: 'Checkout confirmation reference',
      }
    );

    assert.strictEqual(attachment.fileName, 'test_evidence.png');
    assert.strictEqual(attachment.mimeType, 'image/png');
    assert.strictEqual(attachment.workspaceId, workspace1.id);
    assert.strictEqual(attachment.taskId, task1.id);
    assert.strictEqual(attachment.category, 'product_media');
    assert.strictEqual(attachment.caption, 'Checkout confirmation reference');
    assert.strictEqual(attachment.storageProvider, 'local');

    // Verify TaskActivity audit log created
    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'attachment_created' },
    });
    assert.ok(activity);
    assert.strictEqual(activity.actorId, userA.id);
  });

  test('List attachments returns persisted files for workspace members', async () => {
    const { attachmentService } = await import('../attachmentService.js');
    const list = await attachmentService.listTaskAttachments(workspace1.id, task1.id, userA.id);

    assert.ok(list.length >= 1);
    assert.strictEqual(list[0].fileName, 'test_evidence.png');
  });

  test('Rejects cross-workspace access to task attachments', async () => {
    const { attachmentService } = await import('../attachmentService.js');
    await assert.rejects(
      async () => {
        await attachmentService.listTaskAttachments(workspace1.id, task1.id, userB.id);
      },
      (err: Error) => err.message.includes('FORBIDDEN')
    );
  });

  test('Download attachment streams stored evidence file', async () => {
    const { attachmentService } = await import('../attachmentService.js');
    const list = await attachmentService.listTaskAttachments(workspace1.id, task1.id, userA.id);
    const attachmentId = list[0].id;

    const download = await attachmentService.getAttachmentForDownload(
      workspace1.id,
      task1.id,
      attachmentId,
      userA.id
    );

    assert.strictEqual(download.attachment.fileName, 'test_evidence.png');
    const chunks: Buffer[] = [];
    for await (const chunk of download.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const streamedContent = Buffer.concat(chunks);
    assert.deepStrictEqual(streamedContent, Buffer.from('FAKE_SCREENSHOT_BINARY_DATA'));
  });

  test('Delete attachment removes file record and logs attachment_deleted TaskActivity', async () => {
    const { attachmentService } = await import('../attachmentService.js');
    const list = await attachmentService.listTaskAttachments(workspace1.id, task1.id, userA.id);
    const attachmentId = list[0].id;

    const res = await attachmentService.deleteAttachment(
      workspace1.id,
      task1.id,
      attachmentId,
      userA.id
    );
    assert.strictEqual(res.success, true);

    // Verify deletion in DB
    const count = await TaskAttachmentModel.count({ where: { id: attachmentId } });
    assert.strictEqual(count, 0);

    // Verify activity event logged
    const activity = await TaskActivityModel.findOne({
      where: { taskId: task1.id, action: 'attachment_deleted' },
    });
    assert.ok(activity);
    assert.strictEqual(activity.actorId, userA.id);
  });
});
