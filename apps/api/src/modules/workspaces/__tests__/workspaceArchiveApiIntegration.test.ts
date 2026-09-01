import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Workspace archive HTTP/PostgreSQL integration', () => {
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let admin: UserModel;
  let qa: UserModel;
  let ownerCookie: string;
  let adminCookie: string;

  const request = (path: string, cookie: string, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    [owner, admin, qa] = await Promise.all(
      ['owner', 'admin', 'qa'].map((role) =>
        UserModel.create({
          email: `workspace-archive-${role}-${stamp}@example.com`,
          name: `Archive ${role}`,
          role: role as 'owner' | 'admin' | 'qa',
          passwordHash: bcrypt.hashSync('Test-password-123!', 10),
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `Archive Workspace ${stamp}`,
      slug: `archive-workspace-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
    ]);
    const [ownerSession, adminSession] = await Promise.all([
      sessionManager.createSession(owner.id, 'TestRunner', '127.0.0.1'),
      sessionManager.createSession(admin.id, 'TestRunner', '127.0.0.1'),
    ]);
    ownerCookie = `${accessTokenCookieName}=${signToken({ userId: owner.id, email: owner.email, role: owner.role, sessionId: ownerSession })}`;
    adminCookie = `${accessTokenCookieName}=${signToken({ userId: admin.id, email: admin.email, role: admin.role, sessionId: adminSession })}`;
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
      await WorkspaceMembershipActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await workspace.destroy({ force: true });
    }
    await UserModel.destroy({ where: { id: [owner.id, admin.id, qa.id] }, force: true });
  });

  test('only the Owner archives/restores, records audit, and blocks mutations while archived', async () => {
    assert.strictEqual(
      (await request(`/workspaces/${workspace.id}/archive`, adminCookie, { method: 'POST' }))
        .status,
      403,
    );
    assert.strictEqual(
      (await request(`/workspaces/${workspace.id}/archive`, ownerCookie, { method: 'POST' }))
        .status,
      200,
    );
    const archived = await WorkspaceModel.findByPk(workspace.id);
    assert.ok(archived?.archivedAt);
    assert.ok(
      await WorkspaceMembershipActivityModel.findOne({
        where: { workspaceId: workspace.id, action: 'workspace_archived', actorId: owner.id },
      }),
    );
    assert.strictEqual(
      (
        await request(`/workspaces/${workspace.id}/members/${qa.id}`, adminCookie, {
          method: 'DELETE',
        })
      ).status,
      409,
    );
    assert.strictEqual(
      (await request(`/workspaces/${workspace.id}/restore`, ownerCookie, { method: 'POST' }))
        .status,
      200,
    );
    const restored = await WorkspaceModel.findByPk(workspace.id);
    assert.strictEqual(restored?.archivedAt, null);
  });
});
