import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { MemberAccessOverviewSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import { UserModel, WorkspaceMemberModel, WorkspaceModel } from '../../../db/models/index.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * MEMBER-ACCESS-HUB P1 (ADR-046): access overview over HTTP on PostgreSQL; no mocks.
 * AC-1.1 only managed Workspaces, AC-1.2 non-managers 403.
 */
describe('Member access overview HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  const ws: Record<string, WorkspaceModel> = {};
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function user(key: string, active = true) {
    users[key] = await UserModel.create({
      email: `${key}-access-${stamp}@example.com`,
      passwordHash: active ? 'hashed_pw' : null,
      name: `Access ${key}`,
      role: 'dev',
    });
    if (active) {
      const sessionId = await sessionManager.createSession(
        users[key].id,
        'AccessTest',
        '127.0.0.1',
      );
      cookies[key] =
        `${accessTokenCookieName}=${signToken({ userId: users[key].id, email: users[key].email, role: users[key].role, sessionId })}`;
    }
  }

  const join = (w: string, u: string, role: 'owner' | 'admin' | 'po' | 'dev' | 'qa') =>
    WorkspaceMemberModel.create({ workspaceId: ws[w].id, userId: users[u].id, role });

  const overview = (actor?: string) =>
    fetch(`${baseUrl}/me/member-access`, {
      headers: actor ? { Cookie: cookies[actor] } : {},
    });

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
    await user('lead');
    await user('dev');
    await user('qa');
    await user('stranger');
    await user('invited', false);
    for (const key of ['alpha', 'beta', 'gamma']) {
      ws[key] = await WorkspaceModel.create({
        name: `Access ${key} ${stamp}`,
        slug: `access-${key}-${stamp}`,
        ownerId: users.lead.id,
      });
    }
    await join('alpha', 'lead', 'owner');
    await join('beta', 'lead', 'admin');
    await join('gamma', 'lead', 'po');
    await join('alpha', 'dev', 'dev');
    await join('gamma', 'dev', 'dev');
    await join('beta', 'qa', 'qa');
    await join('alpha', 'invited', 'qa');
    await join('gamma', 'stranger', 'admin');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-1.1: lists only Workspaces the actor manages, with each person once', async () => {
    const response = await overview('lead');
    assert.strictEqual(response.status, 200);
    const data = MemberAccessOverviewSchema.parse(
      ((await response.json()) as { data: unknown }).data,
    );

    assert.deepStrictEqual(
      data.workspaces.map((w) => [w.id, w.actorRole, w.memberCount]),
      [
        [ws.alpha.id, 'owner', 3],
        [ws.beta.id, 'admin', 2],
      ],
    );
    const ids = new Set(data.people.map((p) => p.userId));
    assert.ok(!ids.has(users.stranger.id), 'Workspace gamma is not managed by the actor');

    const dev = data.people.find((p) => p.userId === users.dev.id)!;
    assert.deepStrictEqual(
      dev.memberships.map((m) => m.workspaceId),
      [ws.alpha.id],
      'membership in an unmanaged Workspace must not leak',
    );
    const lead = data.people.find((p) => p.userId === users.lead.id)!;
    assert.deepStrictEqual(lead.memberships.map((m) => m.role).sort(), ['admin', 'owner']);

    const invited = data.people.find((p) => p.userId === users.invited.id)!;
    assert.strictEqual(invited.activation, 'pending');
    assert.strictEqual(dev.activation, 'active');
  });

  test('AC-1.2: members who manage no Workspace get 403; anonymous gets 401', async () => {
    for (const actor of ['dev', 'qa']) {
      assert.strictEqual((await overview(actor)).status, 403, actor);
    }
    assert.strictEqual((await overview()).status, 401);
  });

  test('a removed membership disappears from the overview', async () => {
    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: ws.beta.id, userId: users.qa.id },
    });
    await membership!.destroy();
    const data = MemberAccessOverviewSchema.parse(
      ((await (await overview('lead')).json()) as { data: unknown }).data,
    );
    assert.ok(!data.people.some((p) => p.userId === users.qa.id));
  });

  test('AC-2.1 / AC-2.3: matrix cells use the per-Workspace endpoints and their limits', async () => {
    const call = (w: string, method: string, path: string, body: unknown) =>
      fetch(`${baseUrl}/workspaces/${ws[w].id}/members${path}`, {
        method,
        headers: { Cookie: cookies.lead, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    // gamma is not managed by lead (PO there) → 403, and nothing changes.
    assert.strictEqual(
      (await call('gamma', 'PATCH', `/${users.dev.id}`, { role: 'qa' })).status,
      403,
    );
    // The Owner role cannot be handed out from a cell.
    assert.strictEqual(
      (await call('alpha', 'PATCH', `/${users.dev.id}`, { role: 'owner' })).status,
      400,
    );
    // Adding to several Workspaces at once fails as a whole when one is not managed.
    const mixed = await call('alpha', 'POST', '', {
      email: users.stranger.email,
      assignments: [
        { workspaceId: ws.alpha.id, role: 'qa', specialties: [] },
        { workspaceId: ws.gamma.id, role: 'qa', specialties: [] },
      ],
    });
    assert.strictEqual(mixed.status, 403);
    // A managed cell change is saved and visible in the overview.
    const changed = await call('alpha', 'PATCH', `/${users.dev.id}`, {
      role: 'dev',
      specialties: ['frontend', 'mobile'],
    });
    assert.strictEqual(changed.status, 200);
    const { data } = (await (await overview('lead')).json()) as {
      data: {
        people: { userId: string; memberships: { workspaceId: string; specialties: string[] }[] }[];
      };
    };
    const dev = data.people.find((p) => p.userId === users.dev.id)!;
    assert.deepStrictEqual(
      dev.memberships.find((m) => m.workspaceId === ws.alpha.id)!.specialties.sort(),
      ['frontend', 'mobile'],
    );
  });

  test('AC-3.1–AC-3.3: resend replaces the invitation token; cancel removes pending access', async () => {
    const post = (actor: string, userId: string, action: string) =>
      fetch(`${baseUrl}/me/member-access/${userId}/${action}`, {
        method: 'POST',
        headers: { Cookie: cookies[actor] },
      });
    const invitedBefore = await UserModel.findByPk(users.invited.id);
    const resent = await post('lead', users.invited.id, 'resend-invite');
    assert.strictEqual(resent.status, 200, await resent.clone().text());
    const invitedAfter = await UserModel.findByPk(users.invited.id);
    assert.ok(invitedAfter!.passwordResetToken);
    assert.notStrictEqual(invitedAfter!.passwordResetToken, invitedBefore!.passwordResetToken);

    // Active accounts cannot be re-invited or cancelled; strangers and non-managers are refused.
    assert.strictEqual((await post('lead', users.dev.id, 'resend-invite')).status, 409);
    assert.strictEqual((await post('lead', users.stranger.id, 'cancel-invite')).status, 404);
    assert.strictEqual((await post('dev', users.invited.id, 'cancel-invite')).status, 403);
    assert.strictEqual((await post('lead', 'nope', 'cancel-invite')).status, 404);

    const cancelled = await post('lead', users.invited.id, 'cancel-invite');
    assert.strictEqual(cancelled.status, 200);
    const body = (await cancelled.json()) as { data: { workspaceIds: string[] } };
    assert.deepStrictEqual(body.data.workspaceIds, [ws.alpha.id]);
    assert.strictEqual(
      await WorkspaceMemberModel.count({ where: { userId: users.invited.id } }),
      0,
    );
    const activity = await WorkspaceMembershipActivityModel.findOne({
      where: { workspaceId: ws.alpha.id, targetUserId: users.invited.id, action: 'member_removed' },
    });
    assert.strictEqual((activity?.metadata as { reason?: string }).reason, 'invitation_canceled');
    const user = await UserModel.findByPk(users.invited.id);
    assert.strictEqual(user!.passwordResetToken, null, 'the link stops working');
    const { data } = (await (await overview('lead')).json()) as {
      data: { people: { userId: string }[] };
    };
    assert.ok(!data.people.some((p) => p.userId === users.invited.id));
  });
});
