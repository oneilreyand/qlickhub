import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';

import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Workspace member addition and auto-provisioning HTTP API integration (FIX-MEMBER-ADDITION-404)', () => {
  let server: Server;
  let baseUrl: string;
  let workspace1: WorkspaceModel;
  let workspace2: WorkspaceModel;
  let owner: UserModel;
  let admin: UserModel;
  let devUser: UserModel;
  let ownerCookie: string;
  let adminCookie: string;
  let devCookie: string;
  const createdUserIds: string[] = [];

  async function request(
    path: string,
    init?: RequestInit,
    cookie: string = ownerCookie,
  ): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });

    const stamp = Date.now();
    owner = await UserModel.create({
      email: `workspace-add-owner-${stamp}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      name: 'Add Member Owner',
      role: 'admin',
    });
    admin = await UserModel.create({
      email: `workspace-add-admin-${stamp}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      name: 'Add Member Admin',
      role: 'admin',
    });
    devUser = await UserModel.create({
      email: `workspace-add-dev-${stamp}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      name: 'Add Member Dev',
      role: 'dev',
    });
    createdUserIds.push(owner.id, admin.id, devUser.id);

    workspace1 = await WorkspaceModel.create({
      name: `Member Addition Workspace 1 ${stamp}`,
      slug: `member-add-ws1-${stamp}`,
      ownerId: owner.id,
    });
    workspace2 = await WorkspaceModel.create({
      name: `Member Addition Workspace 2 ${stamp}`,
      slug: `member-add-ws2-${stamp}`,
      ownerId: owner.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: owner.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: owner.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: admin.id,
      role: 'admin',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace2.id,
      userId: admin.id,
      role: 'admin',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace1.id,
      userId: devUser.id,
      role: 'dev',
    });

    const ownerSession = await sessionManager.createSession(owner.id, 'TestRunner', '127.0.0.1');
    const adminSession = await sessionManager.createSession(admin.id, 'TestRunner', '127.0.0.1');
    const devSession = await sessionManager.createSession(devUser.id, 'TestRunner', '127.0.0.1');

    ownerCookie = `${accessTokenCookieName}=${signToken({ userId: owner.id, email: owner.email, role: owner.role, sessionId: ownerSession })}`;
    adminCookie = `${accessTokenCookieName}=${signToken({ userId: admin.id, email: admin.email, role: admin.role, sessionId: adminSession })}`;
    devCookie = `${accessTokenCookieName}=${signToken({ userId: devUser.id, email: devUser.email, role: devUser.role, sessionId: devSession })}`;
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace1 && workspace2) {
      await WorkspaceMemberSpecialtyModel.destroy({
        where: { workspaceId: [workspace1.id, workspace2.id] },
      });
      await WorkspaceMembershipActivityModel.destroy({
        where: { workspaceId: [workspace1.id, workspace2.id] },
      });
      await WorkspaceMemberModel.destroy({
        where: { workspaceId: [workspace1.id, workspace2.id] },
        force: true,
      });
      await WorkspaceModel.destroy({
        where: { id: [workspace1.id, workspace2.id] },
        force: true,
      });
    }
    if (createdUserIds.length > 0) {
      await UserModel.destroy({ where: { id: createdUserIds }, force: true });
    }
  });

  test('inviting a new unregistered QA user automatically provisions user and creates workspace membership', async () => {
    const newEmail = `qa.new.user.${Date.now()}@assist.id`;
    const res = await request(`/workspaces/${workspace1.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: newEmail,
        role: 'qa',
        specialties: [],
        workspaceIds: [workspace1.id],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as {
      data: {
        id: string;
        workspaceId: string;
        userId: string;
        role: string;
        user: { email: string; name: string };
      };
    };

    assert.strictEqual(body.data.workspaceId, workspace1.id);
    assert.strictEqual(body.data.role, 'qa');
    assert.strictEqual(body.data.user.email, newEmail);
    assert.ok(body.data.userId);
    createdUserIds.push(body.data.userId);

    // Verify user was persisted in users table with default credentials
    const createdUser = await UserModel.findByPk(body.data.userId);
    assert.ok(createdUser);
    assert.strictEqual(createdUser.email, newEmail);
    assert.strictEqual(createdUser.role, 'qa');
    assert.ok(createdUser.passwordHash);
    const passMatch = await bcrypt.compare('Password123!', createdUser.passwordHash);
    assert.strictEqual(passMatch, true);

    // Verify membership was persisted in workspace_members table
    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace1.id, userId: createdUser.id },
    });
    assert.ok(membership);
    assert.strictEqual(membership.role, 'qa');
  });

  test('inviting a new unregistered Developer automatically provisions user and persists developer specialties', async () => {
    const devEmail = `dev.new.user.${Date.now()}@assist.id`;
    const res = await request(`/workspaces/${workspace1.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: devEmail,
        role: 'dev',
        specialties: ['frontend', 'backend'],
        workspaceIds: [workspace1.id],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as {
      data: {
        userId: string;
        role: string;
        specialties: string[];
      };
    };

    assert.strictEqual(body.data.role, 'dev');
    assert.deepStrictEqual(body.data.specialties.sort(), ['backend', 'frontend']);
    createdUserIds.push(body.data.userId);

    // Verify specialties in database
    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace1.id, userId: body.data.userId },
    });
    assert.ok(membership);
    const specialties = await WorkspaceMemberSpecialtyModel.findAll({
      where: { workspaceId: workspace1.id, workspaceMemberId: membership.id },
    });
    assert.deepStrictEqual(specialties.map((s) => s.specialty).sort(), ['backend', 'frontend']);
  });

  test('multi-workspace member addition provisions user and grants membership to all target workspaces', async () => {
    const multiEmail = `multi.workspace.user.${Date.now()}@assist.id`;
    const res = await request(`/workspaces/${workspace1.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: multiEmail,
        role: 'po',
        specialties: [],
        workspaceIds: [workspace1.id, workspace2.id],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as { data: { userId: string } };
    createdUserIds.push(body.data.userId);

    const m1 = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace1.id, userId: body.data.userId },
    });
    const m2 = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace2.id, userId: body.data.userId },
    });
    assert.ok(m1);
    assert.ok(m2);
    assert.strictEqual(m1.role, 'po');
    assert.strictEqual(m2.role, 'po');
  });

  test('inviting a soft-deleted user restores the user account and workspace membership', async () => {
    const restoredEmail = `restored.user.${Date.now()}@assist.id`;
    const userToSoftDelete = await UserModel.create({
      email: restoredEmail,
      name: 'Restored User',
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'qa',
    });
    createdUserIds.push(userToSoftDelete.id);
    await userToSoftDelete.destroy(); // Soft delete user

    const res = await request(`/workspaces/${workspace1.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: restoredEmail,
        role: 'qa',
        specialties: [],
      }),
    });

    assert.strictEqual(res.status, 201);
    const reloaded = await UserModel.findByPk(userToSoftDelete.id);
    assert.ok(reloaded);
    assert.strictEqual(reloaded.deletedAt, null);

    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace1.id, userId: userToSoftDelete.id },
    });
    assert.ok(membership);
    assert.strictEqual(membership.role, 'qa');
  });

  test('workspace admin can also invite new members', async () => {
    const adminInvitedEmail = `admin.invited.${Date.now()}@assist.id`;
    const res = await request(
      `/workspaces/${workspace1.id}/members`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: adminInvitedEmail,
          role: 'qa',
          specialties: [],
          workspaceIds: [workspace1.id],
        }),
      },
      adminCookie,
    );

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as { data: { userId: string } };
    createdUserIds.push(body.data.userId);

    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace1.id, userId: body.data.userId },
    });
    assert.ok(membership);
    assert.strictEqual(membership.role, 'qa');
  });

  test('rejects adding an existing active member to all selected workspaces with 409 Conflict', async () => {
    const res = await request(`/workspaces/${workspace1.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: admin.email,
        role: 'admin',
        specialties: [],
        workspaceIds: [workspace1.id],
      }),
    });

    assert.strictEqual(res.status, 409);
  });

  test('rejects assigning the owner role with 400 validation / forbidden guard', async () => {
    const res = await request(`/workspaces/${workspace1.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: `someone.${Date.now()}@example.com`,
        role: 'owner',
      }),
    });

    assert.strictEqual(res.status, 400);
  });

  test('rejects non-owner / non-admin callers with 403 Forbidden', async () => {
    const res = await request(
      `/workspaces/${workspace1.id}/members`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: `forbidden.${Date.now()}@example.com`,
          role: 'qa',
        }),
      },
      devCookie,
    );

    assert.strictEqual(res.status, 403);
  });
});
