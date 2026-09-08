import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AuthSecurityEventModel,
  TaskAttachmentModel,
  TaskModel,
  UserModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { storageService } from '../../../services/storageService.js';

describe('Permanent Workspace deletion HTTP/PostgreSQL integration', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let admin: UserModel;
  let workspace: WorkspaceModel;
  let ownerCookie: string;
  let adminCookie: string;
  let storedRef: string;

  const request = (path: string, cookie: string, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    [owner, admin] = await Promise.all(
      ['owner', 'admin'].map((role) =>
        UserModel.create({
          email: `workspace-delete-${role}-${stamp}@example.com`,
          name: `Delete ${role}`,
          role: role as 'owner' | 'admin',
          passwordHash: bcrypt.hashSync('Test-password-123!', 10),
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `Permanent Delete ${stamp}`,
      slug: `permanent-delete-${stamp}`,
      ownerId: owner.id,
      archivedAt: new Date(),
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
    ]);
    const [ownerSession, adminSession] = await Promise.all([
      sessionManager.createSession(owner.id, 'TestRunner', '127.0.0.1'),
      sessionManager.createSession(admin.id, 'TestRunner', '127.0.0.1'),
    ]);
    ownerCookie = `${accessTokenCookieName}=${signToken({ userId: owner.id, email: owner.email, role: owner.role, sessionId: ownerSession })}`;
    adminCookie = `${accessTokenCookieName}=${signToken({ userId: admin.id, email: admin.email, role: admin.role, sessionId: adminSession })}`;

    const folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Delete me',
      createdBy: owner.id,
    });
    const task = await TaskModel.create({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: 'Delete me too',
      reporterId: owner.id,
      status: 'todo',
      priority: 'medium',
    });
    const stored = await storageService.saveFile({
      buffer: Buffer.from('permanent deletion evidence'),
      fileName: 'evidence.txt',
      mimeType: 'text/plain',
      workspaceId: workspace.id,
      taskId: task.id,
    });
    storedRef = stored.storageRef;
    await TaskAttachmentModel.create({
      workspaceId: workspace.id,
      taskId: task.id,
      fileName: 'evidence.txt',
      fileSize: stored.fileSize,
      mimeType: 'text/plain',
      storageRef: stored.storageRef,
      storageProvider: stored.provider,
      providerFileId: stored.providerFileId,
      category: 'general',
      uploaderId: owner.id,
    });
    await AuthSecurityEventModel.create({
      eventType: 'member_password_reset',
      workspaceId: workspace.id,
      actorId: owner.id,
      subjectUserId: admin.id,
      metadata: {
        revokedSessionCount: 0,
        actorWorkspaceRole: 'owner',
        targetWorkspaceRole: 'admin',
      },
    });

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await AuthSecurityEventModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskAttachmentModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceMembershipActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    }
    await UserModel.destroy({ where: { id: [owner.id, admin.id] }, force: true });
    void storedRef;
  });

  test('enforces Owner, archived state, and exact-name confirmation', async () => {
    assert.strictEqual(
      (
        await request(`/workspaces/${workspace.id}`, adminCookie, {
          method: 'DELETE',
          body: JSON.stringify({ confirmationName: workspace.name }),
        })
      ).status,
      403,
    );
    assert.strictEqual(
      (
        await request(`/workspaces/${workspace.id}`, ownerCookie, {
          method: 'DELETE',
          body: JSON.stringify({ confirmationName: 'wrong name' }),
        })
      ).status,
      400,
    );
    const stillPresent = await WorkspaceModel.findByPk(workspace.id);
    assert.ok(stillPresent);
  });

  test('permanently deletes Workspace records and storage while retaining users', async () => {
    const response = await request(`/workspaces/${workspace.id}`, ownerCookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirmationName: workspace.name }),
    });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), {
      data: { workspaceId: workspace.id, deleted: true },
    });
    assert.strictEqual(await WorkspaceModel.findByPk(workspace.id), null);
    assert.strictEqual(
      await WorkFolderModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.strictEqual(
      await TaskModel.findOne({ where: { workspaceId: workspace.id }, paranoid: false }),
      null,
    );
    assert.strictEqual(
      await TaskAttachmentModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.strictEqual(
      await AuthSecurityEventModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.ok(await UserModel.findByPk(owner.id));
    await assert.rejects(
      storageService.openFile({ provider: 'local', storageRef: storedRef, providerFileId: null }),
    );
  });
});
