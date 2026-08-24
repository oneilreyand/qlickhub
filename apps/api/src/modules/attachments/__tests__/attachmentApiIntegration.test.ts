import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { Server } from 'node:http';
import { createApp } from '../../../app.js';
import {
  TaskActivityModel,
  TaskAttachmentModel,
  TaskModel,
  TestCaseModel,
  TestResultEvidenceModel,
  TestResultModel,
  TestRunModel,
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
  let po: UserModel;
  let qa: UserModel;
  let dev: UserModel;
  let outsider: UserModel;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let task: TaskModel;
  let ownerCookie: string;
  let poCookie: string;
  let qaCookie: string;
  let devCookie: string;
  let outsiderCookie: string;
  let attachmentId: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'AttachmentIntegrationTest',
      '127.0.0.1',
    );
    return `${accessTokenCookieName}=${signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    })}`;
  }

  async function upload(
    cookie: string,
    fileName: string,
    category: 'general' | 'product_media' | 'qa_evidence' = 'general',
  ): Promise<{ id: string; content: Buffer }> {
    const content = Buffer.from(`${fileName} integration bytes`);
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'text/plain',
          'x-file-name': encodeURIComponent(fileName),
          'x-attachment-category': category,
        },
        body: content,
      },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as { attachment: { id: string } };
    return { id: body.attachment.id, content };
  }

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
    [owner, po, qa, dev, outsider] = await Promise.all([
      UserModel.create({
        email: `attachment-owner-${timestamp}@example.com`,
        passwordHash: 'integration-test-password-hash',
        name: 'Attachment Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `attachment-po-${timestamp}@example.com`,
        passwordHash: 'integration-test-password-hash',
        name: 'Attachment Product Owner',
        role: 'po',
      }),
      UserModel.create({
        email: `attachment-qa-${timestamp}@example.com`,
        passwordHash: 'integration-test-password-hash',
        name: 'Attachment QA',
        role: 'qa',
      }),
      UserModel.create({
        email: `attachment-dev-${timestamp}@example.com`,
        passwordHash: 'integration-test-password-hash',
        name: 'Attachment Developer',
        role: 'dev',
      }),
      UserModel.create({
        email: `attachment-outsider-${timestamp}@example.com`,
        passwordHash: 'integration-test-password-hash',
        name: 'Other Workspace Owner',
        role: 'owner',
      }),
    ]);

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

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
    ]);
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

    [ownerCookie, poCookie, qaCookie, devCookie, outsiderCookie] = await Promise.all([
      authCookie(owner),
      authCookie(po),
      authCookie(qa),
      authCookie(dev),
      authCookie(outsider),
    ]);
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }

    await TestResultEvidenceModel.destroy({ where: { workspaceId: workspace.id } });
    await TestResultModel.destroy({ where: { workspaceId: workspace.id } });
    await TestRunModel.destroy({ where: { workspaceId: workspace.id } });
    await TestCaseModel.destroy({ where: { workspaceId: workspace.id } });

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
    await UserModel.destroy({
      where: { id: [owner.id, po.id, qa.id, dev.id, outsider.id] },
      force: true,
    });
  });

  test('rejects unauthenticated attachment reads at the HTTP boundary', async () => {
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
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
          'x-attachment-category': 'general',
          'x-attachment-caption': encodeURIComponent('Checkout confirmation'),
        },
        body: fileContent,
      },
    );

    assert.strictEqual(uploadResponse.status, 201);
    const uploadBody = (await uploadResponse.json()) as {
      attachment: { id: string; fileName: string; category: string };
    };
    attachmentId = uploadBody.attachment.id;
    assert.strictEqual(uploadBody.attachment.fileName, 'checkout-evidence.png');
    assert.strictEqual(uploadBody.attachment.category, 'general');

    const listResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(listResponse.status, 200);
    const listBody = (await listResponse.json()) as {
      attachments: Array<{ id: string; fileName: string }>;
    };
    assert.ok(listBody.attachments.some((item) => item.id === attachmentId));

    const activityResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/activity`,
      { headers: { Cookie: ownerCookie } },
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
      { headers: { Cookie: outsiderCookie } },
    );

    assert.strictEqual(response.status, 403);
  });

  test('enforces planner, uploader, and non-uploader delete boundaries through HTTP', async () => {
    const forbiddenResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${attachmentId}`,
      { method: 'DELETE', headers: { Cookie: devCookie } },
    );
    assert.strictEqual(forbiddenResponse.status, 403);
    assert.ok(await TaskAttachmentModel.findByPk(attachmentId));

    const qaUpload = await upload(qaCookie, 'qa-owned-general.txt');
    const uploaderDeleteResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${qaUpload.id}`,
      { method: 'DELETE', headers: { Cookie: qaCookie } },
    );
    assert.strictEqual(uploaderDeleteResponse.status, 200);
    assert.deepStrictEqual(await uploaderDeleteResponse.json(), {
      success: true,
      storageCleanupPending: false,
    });

    const plannerTarget = await upload(ownerCookie, 'planner-removal-target.txt');
    const plannerDeleteResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${plannerTarget.id}`,
      { method: 'DELETE', headers: { Cookie: poCookie } },
    );
    assert.strictEqual(plannerDeleteResponse.status, 200);
    assert.strictEqual(await TaskAttachmentModel.findByPk(plannerTarget.id), null);
  });

  test('blocks deletion of category-level QA evidence and preserves its stored file', async () => {
    const immutableEvidence = await upload(qaCookie, 'immutable-qa-evidence.txt', 'qa_evidence');
    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${immutableEvidence.id}`,
      { method: 'DELETE', headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(response.status, 409);
    const body = (await response.json()) as { code: string };
    assert.strictEqual(body.code, 'IMMUTABLE_EVIDENCE');
    assert.ok(await TaskAttachmentModel.findByPk(immutableEvidence.id));

    const downloadResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${immutableEvidence.id}/download`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.deepStrictEqual(
      Buffer.from(await downloadResponse.arrayBuffer()),
      immutableEvidence.content,
    );
  });

  test('blocks deletion of an ordinary attachment after it becomes immutable Test Result evidence', async () => {
    const linkedEvidence = await upload(ownerCookie, 'linked-result-evidence.txt', 'general');
    const testCase = await TestCaseModel.create({
      workspaceId: workspace.id,
      title: 'Attachment immutability integration case',
      createdBy: owner.id,
    });
    const testRun = await TestRunModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      build: 'attachment-immutability-build',
      environment: 'test',
      executorId: owner.id,
    });
    const testResult = await TestResultModel.create({
      workspaceId: workspace.id,
      testRunId: testRun.id,
      status: 'passed',
      executorId: owner.id,
    });
    await TestResultEvidenceModel.create({
      workspaceId: workspace.id,
      testResultId: testResult.id,
      attachmentId: linkedEvidence.id,
      linkedBy: owner.id,
    });

    const response = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${linkedEvidence.id}`,
      { method: 'DELETE', headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(response.status, 409);
    assert.ok(await TaskAttachmentModel.findByPk(linkedEvidence.id));

    const downloadResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${linkedEvidence.id}/download`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.deepStrictEqual(
      Buffer.from(await downloadResponse.arrayBuffer()),
      linkedEvidence.content,
    );
  });

  test('streams and deletes persisted evidence through authenticated HTTP routes', async () => {
    const downloadResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${attachmentId}/download`,
      { headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(downloadResponse.headers.get('content-type'), 'image/png');
    assert.deepStrictEqual(
      Buffer.from(await downloadResponse.arrayBuffer()),
      Buffer.from('PNG integration evidence bytes'),
    );

    const deleteResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments/${attachmentId}`,
      { method: 'DELETE', headers: { Cookie: ownerCookie } },
    );
    assert.strictEqual(deleteResponse.status, 200);

    const listResponse = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/tasks/${task.id}/attachments`,
      { headers: { Cookie: ownerCookie } },
    );
    const listBody = (await listResponse.json()) as {
      attachments: Array<{ id: string }>;
    };
    assert.ok(!listBody.attachments.some((item) => item.id === attachmentId));
  });
});
