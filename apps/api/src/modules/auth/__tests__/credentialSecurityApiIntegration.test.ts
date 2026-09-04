import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AuthSecurityEventModel,
  AuthSessionModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../jwt.js';
import { sessionManager } from '../sessionManager.js';
import { authSecurityEventService } from '../authSecurityEventService.js';

describe('Credential security HTTP/PostgreSQL integration (AUTH-005, AUTH-006)', () => {
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
    await AuthSecurityEventModel.destroy({
      where: {
        [Op.or]: [
          { actorId: userIds },
          { subjectUserId: userIds },
          { workspaceId: [workspace.id, otherWorkspace.id] },
        ],
      },
    });
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

    const auditEvent = await AuthSecurityEventModel.findOne({
      where: {
        eventType: 'member_password_reset',
        workspaceId: workspace.id,
        actorId: owner.id,
        subjectUserId: peerAdmin.id,
      },
    });
    assert.ok(auditEvent);
    assert.deepStrictEqual(auditEvent.metadata, {
      revokedSessionCount: 2,
      actorWorkspaceRole: 'owner',
      targetWorkspaceRole: 'admin',
    });
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

    const auditEvent = await AuthSecurityEventModel.findOne({
      where: {
        eventType: 'password_changed',
        actorId: selfServiceUser.id,
        subjectUserId: selfServiceUser.id,
      },
    });
    assert.ok(auditEvent);
    assert.strictEqual(auditEvent.workspaceId, null);
    assert.deepStrictEqual(auditEvent.metadata, { revokedSessionCount: 1 });
  });

  test('authenticated self reads return only events involving that user', async () => {
    cookies.set(peerAdmin.id, await createCookie(peerAdmin));
    const response = await fetch(`${baseUrl}/auth/security-events?limit=10`, {
      headers: { Cookie: cookies.get(peerAdmin.id)! },
    });
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as {
      data: { events: Array<Record<string, unknown>>; limit: number };
    };
    assert.strictEqual(body.data.limit, 10);
    assert.ok(body.data.events.length >= 1);
    assert.ok(
      body.data.events.every(
        (event) => event.actorId === peerAdmin.id || event.subjectUserId === peerAdmin.id,
      ),
    );
    const serialized = JSON.stringify(body).toLowerCase();
    for (const prohibited of [
      'passwordhash',
      'resettoken',
      'authorization',
      'cookie',
      'useragent',
      'ipaddress',
      '@example.com',
    ]) {
      assert.ok(!serialized.includes(prohibited), `response must not contain ${prohibited}`);
    }
  });

  test('Workspace reads require exact active Owner/Admin membership', async () => {
    for (const actor of [owner, admin]) {
      const response = await fetch(
        `${baseUrl}/auth/security-events?workspaceId=${workspace.id}&limit=100`,
        { headers: { Cookie: cookies.get(actor.id)! } },
      );
      assert.strictEqual(response.status, 200);
      const body = (await response.json()) as {
        data: { events: Array<{ workspaceId: string; createdAt: string }> };
      };
      assert.ok(body.data.events.length >= 4);
      assert.ok(body.data.events.every((event) => event.workspaceId === workspace.id));
      const timestamps = body.data.events.map((event) => Date.parse(event.createdAt));
      assert.deepStrictEqual(
        timestamps,
        [...timestamps].sort((a, b) => b - a),
      );
    }

    for (const actor of [po, globalAdminWithoutMembership, otherWorkspaceOwner]) {
      const response = await fetch(`${baseUrl}/auth/security-events?workspaceId=${workspace.id}`, {
        headers: { Cookie: cookies.get(actor.id)! },
      });
      assert.strictEqual(response.status, 403);
    }
  });

  test('security-event reads require authentication and valid bounded input', async () => {
    assert.strictEqual((await fetch(`${baseUrl}/auth/security-events`)).status, 401);
    const invalid = await fetch(`${baseUrl}/auth/security-events?limit=101`, {
      headers: { Cookie: cookies.get(owner.id)! },
    });
    assert.strictEqual(invalid.status, 400);
  });

  test('PostgreSQL rejects updates to credential security events', async () => {
    const event = await AuthSecurityEventModel.findOne({
      where: { workspaceId: workspace.id },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(event);
    await assert.rejects(
      event.update({ metadata: { revokedSessionCount: 999 } }),
      /append-only and cannot be updated/,
    );
  });

  test('PostgreSQL rejects unapproved or secret-bearing audit metadata', async () => {
    await assert.rejects(
      AuthSecurityEventModel.create({
        eventType: 'password_changed',
        workspaceId: null,
        actorId: owner.id,
        subjectUserId: owner.id,
        metadata: {
          revokedSessionCount: 0,
          resetToken: 'must-never-be-persisted',
        } as never,
      }),
      /ck_auth_security_events_metadata_shape/,
    );
  });

  test('PostgreSQL rejects null audit identity and role values', async () => {
    await assert.rejects(
      AuthSecurityEventModel.create({
        eventType: 'password_changed',
        workspaceId: null,
        actorId: owner.id,
        subjectUserId: null,
        metadata: { revokedSessionCount: 0 },
      }),
      /ck_auth_security_events_identity/,
    );
    for (const roleField of ['actorWorkspaceRole', 'targetWorkspaceRole']) {
      await assert.rejects(
        AuthSecurityEventModel.create({
          eventType: 'member_password_reset',
          workspaceId: workspace.id,
          actorId: owner.id,
          subjectUserId: peerAdmin.id,
          metadata: {
            revokedSessionCount: 0,
            actorWorkspaceRole: 'owner',
            targetWorkspaceRole: 'admin',
            [roleField]: null,
          } as never,
        }),
        /ck_auth_security_events_metadata_shape/,
      );
    }
  });

  test('audit write failure rolls back credential and session mutations', async () => {
    await owner.reload();
    const originalHash = owner.passwordHash;
    const sessionId = sessionIds.get(owner.id)!;
    assert.strictEqual((await sessionManager.isSessionActive(owner.id, sessionId)).active, true);
    const eventCount = await AuthSecurityEventModel.count({ where: { subjectUserId: owner.id } });

    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await owner.update(
          { passwordHash: await bcrypt.hash('Rollback-only-password!', 4) },
          { transaction },
        );
        await sessionManager.revokeAllSessions(owner.id, transaction);
        // A deliberately invalid count exercises the real PostgreSQL constraint, not a mock.
        await authSecurityEventService.recordPasswordChanged(owner.id, -1, transaction);
      }),
      /ck_auth_security_events_metadata_shape/,
    );

    await owner.reload();
    assert.strictEqual(owner.passwordHash, originalHash);
    assert.strictEqual((await sessionManager.isSessionActive(owner.id, sessionId)).active, true);
    assert.strictEqual(
      await AuthSecurityEventModel.count({ where: { subjectUserId: owner.id } }),
      eventCount,
    );
  });
});
