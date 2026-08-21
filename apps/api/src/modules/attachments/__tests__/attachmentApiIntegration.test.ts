import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { Server } from 'node:http';
import { createApp } from '../../../app.js';
import {
  TaskActivityModel,
  TaskAttachmentModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { storageService } from '../../../services/storageService.js';

describe('Attachment HTTP API & Evidence Storage Integration Tests', () => {
  let appServer: Server;
  let baseUrl: string;
  let owner: UserModel;
  let outsider: UserModel;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let task: TaskModel;
  let ownerCookie: string;
  let outsiderCookie: string;
  let attachmentId: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const address = appServer.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const timestamp = Date.now();
    owner = await UserModel.create({
      email: `attachment-owner-${timestamp}@example.com`,
      passwordHash: 'integration-test-password-hash',
      name: 'Attachment Owner',
      role: 'admin',
    });
    outsider = await UserModel.create({
      email: `attachment-outsider-${timestamp}@example.com`,
      passwordHash: 'integration-test-password-hash',
      name: 'Other Workspace Owner',
      role: 'admin',
    });

    workspace = await WorkspaceModel.create({
      name: 'Attachment API Workspace',
      slug: `attachment-api-${timestamp}`,
      ownerId: owner.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: 'Other Attachment Workspace',
      slug: `attachment-other-${timestamp}`,
      ownerId: outsider.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: otherWorkspace.id,
      userId: outsider.id,
      role: 'owner',
    });

    task = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Task with persisted evidence',
      status: 'todo',
      priority: 'medium',
      reporterId: owner.id,
    });

    const ownerSessionId = await sessionManager.createSession(
      owner.id,
      'AttachmentIntegrationTest',
      '127.0.0.1'
    );
    ownerCookie = `${accessTokenCookieName}=${signToken({
      userId: owner.id,
      email: owner.email,
      role: owner.role,
      sessionId: ownerSessionId,
    })}`;

    const outsiderSessionId = await sessionManager.createSession(
      outsider.id,
      'AttachmentIntegrationTest',
      '127.0.0.1'
    );
    outsiderCookie = `${accessTokenCookieName}=${signToken({
      userId: outsider.id,
      email: outsider.email,
      role: outsider.role,
      sessionId: outsiderSessionId,
    })}`;
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }

    const remainingAttachments = await TaskAttachmentModel.findAll({
      where: { taskId: task.id },
    });
    for (const attachment of remainingAttachments) {
      await storageService.deleteFile({
        provider: attachment.storageProvider,
        storageRef: attachment.storageRef,
        providerFileId: attachment.providerFileId,
      });
    }

    await TaskAttachmentModel.destroy({ where: { taskId: task.id } });
    await TaskActivityModel.destroy({ where: { taskId: task.id } });
    await TaskModel.destroy({ where: { id: task.id }, force: true });
    await WorkspaceModel.destroy({
      where: { id: [workspace.id, otherWorkspace.id] },
      force: true,
    });
    await UserModel.destroy({ where: { id: [owner.id, outsider.id] }, force: true });
  });

  test('rejects unauthenticated attachment reads at the HTTP boundary', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`
    );

    assert.strictEqual(response.status, 401);
  });

  test('uploads, persists, lists, and audits evidence through authenticated HTTP routes', async () => {
    const fileContent = Buffer.from('PNG integration evidence bytes');
    const uploadResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      {
        method: 'POST',
        headers: {
          Cookie: ownerCookie,
          'Content-Type': 'image/png',
          'x-file-name': encodeURIComponent('checkout-evidence.png'),
          'x-attachment-category': 'qa_evidence',
          'x-attachment-caption': encodeURIComponent('Checkout confirmation'),
        },
        body: fileContent,
      }
    );

    assert.strictEqual(uploadResponse.status, 201);
    const uploadBody = (await uploadResponse.json()) as {
      attachment: { id: string; fileName: string; category: string };
    };
    attachmentId = uploadBody.attachment.id;
    assert.strictEqual(uploadBody.attachment.fileName, 'checkout-evidence.png');
    assert.strictEqual(uploadBody.attachment.category, 'qa_evidence');

    const listResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      { headers: { Cookie: ownerCookie } }
    );
    assert.strictEqual(listResponse.status, 200);
    const listBody = (await listResponse.json()) as {
      attachments: Array<{ id: string; fileName: string }>;
    };
    assert.ok(listBody.attachments.some((item) => item.id === attachmentId));

    const activityResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/activity`,
      { headers: { Cookie: ownerCookie } }
    );
    assert.strictEqual(activityResponse.status, 200);
    const activityBody = (await activityResponse.json()) as {
      data: { activities: Array<{ action: string }> };
    };
    const activity = activityBody.data.activities;
    assert.ok(activity.some((item) => item.action === 'attachment_created'));
  });

  test('blocks cross-workspace attachment access through middleware', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      { headers: { Cookie: outsiderCookie } }
    );

    assert.strictEqual(response.status, 403);
  });

  test('streams and deletes persisted evidence through authenticated HTTP routes', async () => {
    const downloadResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${attachmentId}/download`,
      { headers: { Cookie: ownerCookie } }
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(downloadResponse.headers.get('content-type'), 'image/png');
    assert.deepStrictEqual(
      Buffer.from(await downloadResponse.arrayBuffer()),
      Buffer.from('PNG integration evidence bytes')
    );

    const deleteResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${attachmentId}`,
      { method: 'DELETE', headers: { Cookie: ownerCookie } }
    );
    assert.strictEqual(deleteResponse.status, 200);

    const listResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      { headers: { Cookie: ownerCookie } }
    );
    const listBody = (await listResponse.json()) as {
      attachments: Array<{ id: string }>;
    };
    assert.ok(!listBody.attachments.some((item) => item.id === attachmentId));
  });
});
