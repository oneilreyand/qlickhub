import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';

import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AuthSessionModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../jwt.js';
import { sessionManager } from '../sessionManager.js';

describe('Credential security HTTP/PostgreSQL integration (AUTH-005)', () => {
  const originalPassword = 'Original-password-123!';
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let owner: UserModel;
  let admin: UserModel;
  let peerAdmin: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let selfServiceUser: UserModel;
  let inactiveUser: UserModel;
  let globalAdminWithoutMembership: UserModel;
  let otherWorkspaceOwner: UserModel;
  const users: UserModel[] = [];
  const cookies = new Map<string, string>();
  const sessionIds = new Map<string, string>();

  async function createUser(label: string, role: UserModel['role']): Promise<UserModel> {
    const user = await UserModel.create({
      email: `credential-${label}-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: await bcrypt.hash(originalPassword, 4),
      name: `Credential ${label}`,
      role,
    });
    users.push(user);
    return user;
  }

  async function createCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'CredentialSecurityIntegration',
      '127.0.0.1',
    );
    sessionIds.set(user.id, sessionId);
    return `${accessTokenCookieName}=${signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    })}`;
  }

  async function adminReset(
    actor: UserModel,
    target: UserModel,
    selectedWorkspaceId: string | null = workspace.id,
    newPassword = 'Administrative-password-456!',
  ): Promise<Response> {
    return await fetch(`${baseUrl}/auth/admin/reset-member-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies.get(actor.id)!,
      },
      body: JSON.stringify({
        ...(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {}),
        targetUserId: target.id,
        newPassword,
      }),
    });
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    [
      owner,
      admin,
      peerAdmin,
      po,
      dev,
      qa,
      selfServiceUser,
      inactiveUser,
      globalAdminWithoutMembership,
      otherWorkspaceOwner,
    ] = await Promise.all([
      createUser('owner', 'owner'),
      createUser('admin', 'admin'),
      createUser('peer-admin', 'admin'),
      createUser('po', 'po'),
      createUser('dev', 'dev'),
      createUser('qa', 'qa'),
      createUser('self-service', 'dev'),
      createUser('inactive', 'qa'),
      createUser('global-admin', 'admin'),
      createUser('other-owner', 'owner'),
    ]);

    const stamp = Date.now();
    [workspace, otherWorkspace] = await Promise.all([
      WorkspaceModel.create({
        name: 'Credential Security Workspace',
        slug: `credential-security-${stamp}`,
        ownerId: owner.id,
      }),
      WorkspaceModel.create({
        name: 'Other Credential Workspace',
        slug: `other-credential-security-${stamp}`,
        ownerId: otherWorkspaceOwner.id,
      }),
    ]);

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
      { workspaceId: workspace.id, userId: peerAdmin.id, role: 'admin' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspace.id, userId: selfServiceUser.id, role: 'dev' },
      { workspaceId: workspace.id, userId: inactiveUser.id, role: 'qa' },
      { workspaceId: otherWorkspace.id, userId: otherWorkspaceOwner.id, role: 'owner' },
    ]);
    const inactiveMembership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace.id, userId: inactiveUser.id },
    });
    assert.ok(inactiveMembership);
    await inactiveMembership.destroy();

    for (const actor of [
      owner,
      admin,
      po,
      selfServiceUser,
      globalAdminWithoutMembership,
      otherWorkspaceOwner,
    ]) {
      cookies.set(actor.id, await createCookie(actor));
    }
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    const userIds = users.map((user) => user.id);
    await AuthSessionModel.destroy({ where: { userId: userIds } });
    await WorkspaceMemberModel.destroy({
      where: { workspaceId: [workspace.id, otherWorkspace.id] },
      force: true,
    });
    await WorkspaceModel.destroy({ where: { id: [workspace.id, otherWorkspace.id] } });
    await UserModel.destroy({ where: { id: userIds }, force: true });
  });

  test('administrative reset requires an explicit valid Workspace ID', async () => {
    assert.strictEqual((await adminReset(owner, po, null)).status, 400);
  });

  test('global role and authority in another Workspace never bypass exact membership', async () => {
    assert.strictEqual((await adminReset(globalAdminWithoutMembership, dev)).status, 403);
    assert.strictEqual((await adminReset(otherWorkspaceOwner, qa)).status, 403);
    assert.strictEqual((await adminReset(owner, inactiveUser)).status, 403);

    for (const target of [dev, qa, inactiveUser]) {
      await target.reload();
      assert.strictEqual(await bcrypt.compare(originalPassword, target.passwordHash!), true);
    }
  });

  test('Owner can reset a non-Owner and every target session is revoked', async () => {
    const targetSessions = await Promise.all([
      sessionManager.createSession(peerAdmin.id, 'Peer admin device 1', '127.0.0.2'),
      sessionManager.createSession(peerAdmin.id, 'Peer admin device 2', '127.0.0.3'),
    ]);
    const replacement = 'Owner-reset-password-456!';

    const response = await adminReset(owner, peerAdmin, workspace.id, replacement);
    assert.strictEqual(response.status, 200);
    await peerAdmin.reload();
    assert.strictEqual(await bcrypt.compare(replacement, peerAdmin.passwordHash!), true);
    for (const sessionId of targetSessions) {
      assert.strictEqual(
        (await sessionManager.isSessionActive(peerAdmin.id, sessionId)).active,
        false,
      );
    }
  });

  test('Admin can reset PO, Developer, and QA and revokes each target session', async () => {
    for (const target of [po, dev, qa]) {
      const targetSession = await sessionManager.createSession(
        target.id,
        `Target ${target.role} device`,
        '127.0.0.4',
      );
      const replacement = `Admin-reset-${target.role}-password-456!`;
      const response = await adminReset(admin, target, workspace.id, replacement);
      assert.strictEqual(response.status, 200);
      await target.reload();
      assert.strictEqual(await bcrypt.compare(replacement, target.passwordHash!), true);
      assert.strictEqual(
        (await sessionManager.isSessionActive(target.id, targetSession)).active,
        false,
      );
    }
  });

  test('Admin cannot reset Owner, another Admin, or self', async () => {
    const targets = [owner, peerAdmin, admin];
    const hashesBefore = new Map(targets.map((target) => [target.id, target.passwordHash]));
    const responses = await Promise.all(targets.map((target) => adminReset(admin, target)));
    assert.deepStrictEqual(
      responses.map((response) => response.status),
      [403, 403, 403],
    );
    for (const target of targets) {
      await target.reload();
      assert.strictEqual(target.passwordHash, hashesBefore.get(target.id));
    }
  });

  test('PO cannot reset another member', async () => {
    cookies.set(po.id, await createCookie(po));
    assert.strictEqual((await adminReset(po, selfServiceUser)).status, 403);
  });

  test('self-change clears reset tokens, preserves current session, and revokes other sessions', async () => {
    const currentSessionId = sessionIds.get(selfServiceUser.id)!;
    const otherSessionId = await sessionManager.createSession(
      selfServiceUser.id,
      'Self-service other device',
      '127.0.0.5',
    );
    selfServiceUser.passwordResetToken = 'outstanding-reset-token-hash';
    selfServiceUser.passwordResetExpiresAt = new Date(Date.now() + 60_000);
    await selfServiceUser.save();

    const response = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies.get(selfServiceUser.id)!,
      },
      body: JSON.stringify({
        currentPassword: originalPassword,
        newPassword: 'Self-service-password-456!',
      }),
    });
    assert.strictEqual(response.status, 200);

    await selfServiceUser.reload();
    assert.strictEqual(selfServiceUser.passwordResetToken, null);
    assert.strictEqual(selfServiceUser.passwordResetExpiresAt, null);
    assert.strictEqual(
      await bcrypt.compare('Self-service-password-456!', selfServiceUser.passwordHash!),
      true,
    );
    assert.strictEqual(
      (await sessionManager.isSessionActive(selfServiceUser.id, currentSessionId)).active,
      true,
    );
    assert.strictEqual(
      (await sessionManager.isSessionActive(selfServiceUser.id, otherSessionId)).active,
      false,
    );
  });
});
