import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { MemberAccessOverviewSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { env } from '../../../config/env.js';
import { sequelize } from '../../../db/sequelize.js';
import { UserModel, WorkspaceMemberModel, WorkspaceModel } from '../../../db/models/index.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * MEMBER-ACCESS-HUB P5 (ADR-046): time-bound membership over HTTP on PostgreSQL.
 * AC-5.1 expired = not a member on every request; AC-5.2 the job only records the expiry;
 * AC-5.3 Owner/Admin set, extend and remove the end date.
 */
describe('Time-bound membership HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  const SECRET = 'test-only-cron-secret-with-at-least-32-characters';
  const previousSecret = env.CRON_SECRET;
  let server: Server;
  let baseUrl: string;
  let ws: WorkspaceModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function user(key: string) {
    users[key] = await UserModel.create({
      email: `${key}-expiry-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Expiry ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(users[key].id, 'ExpiryTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: users[key].id, email: users[key].email, role: users[key].role, sessionId })}`;
  }

  const call = (actor: string, method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Cookie: cookies[actor], 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const setExpiry = (actor: string, target: string, expiresOn: string | null) =>
    call(actor, 'PUT', `/workspaces/${ws.id}/members/${users[target].id}/expiry`, { expiresOn });
  const jakartaDay = (offsetDays: number) =>
    new Date(Date.now() + 7 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
  const forceExpire = (target: string) =>
    WorkspaceMemberModel.unscoped().update(
      { expiresAt: new Date(Date.now() - 60_000) },
      { where: { workspaceId: ws.id, userId: users[target].id } },
    );

  before(async () => {
    await sequelize.authenticate();
    env.CRON_SECRET = SECRET;
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });
    for (const key of ['lead', 'admin', 'admin2', 'dev', 'qa']) await user(key);
    ws = await WorkspaceModel.create({
      name: `Expiry ${stamp}`,
      slug: `expiry-${stamp}`,
      ownerId: users.lead.id,
      timezone: 'Asia/Jakarta',
    } as never);
    const join = (u: string, role: 'owner' | 'admin' | 'dev' | 'qa') =>
      WorkspaceMemberModel.create({ workspaceId: ws.id, userId: users[u].id, role });
    await join('lead', 'owner');
    await join('admin', 'admin');
    await join('admin2', 'admin');
    await join('dev', 'dev');
    await join('qa', 'qa');
  });

  after(async () => {
    env.CRON_SECRET = previousSecret;
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-5.3: the end date is the last day in the Workspace time zone; limits are enforced', async () => {
    const today = jakartaDay(0);
    const response = await setExpiry('lead', 'dev', today);
    assert.strictEqual(response.status, 200, await response.clone().text());
    const { data } = (await response.json()) as { data: { expiresAt: string } };
    // Access ends at 00:00 Asia/Jakarta (17:00 UTC) after the chosen day.
    assert.strictEqual(data.expiresAt, `${today}T17:00:00.000Z`);

    assert.strictEqual((await setExpiry('lead', 'dev', jakartaDay(-1))).status, 400);
    assert.strictEqual((await setExpiry('admin', 'lead', jakartaDay(5))).status, 403, 'Owner');
    assert.strictEqual((await setExpiry('admin', 'admin2', jakartaDay(5))).status, 403, 'Admin');
    assert.strictEqual((await setExpiry('admin', 'admin', jakartaDay(5))).status, 403, 'self');
    assert.strictEqual((await setExpiry('qa', 'dev', jakartaDay(5))).status, 403, 'non-manager');
    assert.strictEqual((await setExpiry('lead', 'qa', 'besok')).status, 400);
    // Still valid today: the member keeps access.
    assert.strictEqual((await call('dev', 'GET', `/workspaces/${ws.id}/members`)).status, 200);

    const log = await WorkspaceMembershipActivityModel.findOne({
      where: { workspaceId: ws.id, targetUserId: users.dev.id, action: 'member_expiry_updated' },
    });
    assert.strictEqual((log?.metadata as { expiresOn?: string }).expiresOn, today);
  });

  test('AC-5.1: once the end passes, every request treats the person as a non-member', async () => {
    await forceExpire('dev');
    const denied = await call('dev', 'GET', `/workspaces/${ws.id}/members`);
    assert.strictEqual(denied.status, 403);
    assert.strictEqual(((await denied.json()) as { code: string }).code, 'MEMBERSHIP_EXPIRED');
    const list = (await (await call('dev', 'GET', '/workspaces')).json()) as {
      data: { id: string }[];
    };
    assert.ok(!list.data.some((w) => w.id === ws.id), 'Workspace list hides it');
    const members = (await (await call('lead', 'GET', `/workspaces/${ws.id}/members`)).json()) as {
      data: { userId: string }[];
    };
    assert.ok(!members.data.some((m) => m.userId === users.dev.id), 'not offered as assignee');

    // The access hub still shows it, marked expired, so it can be extended.
    const overview = MemberAccessOverviewSchema.parse(
      ((await (await call('lead', 'GET', '/me/member-access')).json()) as { data: unknown }).data,
    );
    const dev = overview.people.find((p) => p.userId === users.dev.id)!;
    assert.strictEqual(dev.memberships[0].expired, true);
  });

  test('AC-5.2: the job records the expiry once and does not decide access', async () => {
    const run = () =>
      fetch(`${baseUrl}/cron/membership-expiry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SECRET}` },
      });
    assert.strictEqual(
      (await fetch(`${baseUrl}/cron/membership-expiry`, { method: 'POST' })).status,
      401,
    );
    assert.strictEqual((await run()).status, 200);
    assert.strictEqual((await run()).status, 200);
    const recorded = await WorkspaceMembershipActivityModel.count({
      where: { workspaceId: ws.id, targetUserId: users.dev.id, action: 'membership_expired' },
    });
    assert.strictEqual(recorded, 1);
    // The membership row is kept, still inactive.
    assert.ok(
      await WorkspaceMemberModel.unscoped().findOne({
        where: { workspaceId: ws.id, userId: users.dev.id },
      }),
    );
  });

  test('AC-5.3: extending or removing the limit restores access; re-inviting clears it', async () => {
    const extended = await setExpiry('admin', 'dev', jakartaDay(10));
    assert.strictEqual(extended.status, 200);
    assert.strictEqual((await call('dev', 'GET', `/workspaces/${ws.id}/members`)).status, 200);
    assert.strictEqual((await setExpiry('admin', 'dev', null)).status, 200);
    const row = await WorkspaceMemberModel.findOne({
      where: { workspaceId: ws.id, userId: users.dev.id },
    });
    assert.strictEqual(row?.expiresAt, null);

    await setExpiry('lead', 'qa', jakartaDay(1));
    await forceExpire('qa');
    const reinvite = await call('lead', 'POST', `/workspaces/${ws.id}/members`, {
      email: users.qa.email,
      assignments: [{ workspaceId: ws.id, role: 'qa', specialties: [] }],
    });
    assert.strictEqual(reinvite.status, 201, await reinvite.clone().text());
    const body = (await reinvite.json()) as { data: { assignmentResults: { status: string }[] } };
    assert.strictEqual(body.data.assignmentResults[0].status, 'restored');
    assert.strictEqual((await call('qa', 'GET', `/workspaces/${ws.id}/members`)).status, 200);
  });

  test('an expired member can still be removed by the Owner', async () => {
    await setExpiry('lead', 'qa', jakartaDay(1));
    await forceExpire('qa');
    const removed = await call('lead', 'DELETE', `/workspaces/${ws.id}/members/${users.qa.id}`);
    assert.strictEqual(removed.status, 200, await removed.clone().text());
  });
});
