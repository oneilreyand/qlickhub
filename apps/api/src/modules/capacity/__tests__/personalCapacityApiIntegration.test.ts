import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  UserTimeOffModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { getEffectiveWeeklyCapacities } from '../internal/personalCapacity.js';

/**
 * WORK-FOUNDATION P4 (ADR-044): Workspace default capacity, personal capacity and time off over
 * HTTP on PostgreSQL; no mocks. AC-4.1 default, AC-4.2 who may edit, AC-4.3 effective value,
 * AC-4.4 time off stores only a date range.
 */
describe('Personal capacity HTTP / PostgreSQL Integration (WORK-FOUNDATION P4)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let wsA: WorkspaceModel;
  let wsB: WorkspaceModel;
  let wsOther: WorkspaceModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function user(key: string) {
    const created = await UserModel.create({
      email: `${key}-cap-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Cap ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(created.id, 'CapTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: created.id, email: created.email, role: created.role, sessionId })}`;
    users[key] = created;
  }
  const join = (key: string, workspace: WorkspaceModel, role: 'owner' | 'admin' | 'po' | 'dev') =>
    WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: users[key].id, role });

  const call = async (actor: string, method: string, path: string, body?: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Cookie: cookies[actor], 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: (await response.json().catch(() => null)) as any,
    };
  };

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
    for (const key of ['owner', 'po', 'dev', 'otherOwner', 'loner']) await user(key);
    wsA = await WorkspaceModel.create({
      name: `Cap A ${stamp}`,
      slug: `cap-a-${stamp}`,
      ownerId: users.owner.id,
    });
    wsB = await WorkspaceModel.create({
      name: `Cap B ${stamp}`,
      slug: `cap-b-${stamp}`,
      ownerId: users.owner.id,
    });
    wsOther = await WorkspaceModel.create({
      name: `Cap O ${stamp}`,
      slug: `cap-o-${stamp}`,
      ownerId: users.otherOwner.id,
    });
    await join('owner', wsA, 'owner');
    await join('owner', wsB, 'owner');
    await join('po', wsA, 'po');
    await join('dev', wsA, 'dev');
    await join('dev', wsB, 'dev');
    await join('otherOwner', wsOther, 'owner');
    await join('dev', wsOther, 'dev');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-4.1: Owner/Admin sets the Workspace default; others 403; invalid values 400', async () => {
    const saved = await call('owner', 'PUT', `/workspaces/${wsA.id}/calendar`, {
      timezone: 'Asia/Jakarta',
      workingDays: [1, 2, 3, 4, 5],
      defaultWeeklyCapacityPoints: 12,
    });
    assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
    assert.strictEqual(saved.body.data.defaultWeeklyCapacityPoints, 12);
    const read = await call('dev', 'GET', `/workspaces/${wsA.id}/calendar`);
    assert.strictEqual(read.body.data.defaultWeeklyCapacityPoints, 12);

    // Older clients that omit the field keep the stored default.
    const legacy = await call('owner', 'PUT', `/workspaces/${wsA.id}/calendar`, {
      timezone: 'Asia/Jakarta',
      workingDays: [1, 2, 3, 4, 5],
    });
    assert.strictEqual(legacy.body.data.defaultWeeklyCapacityPoints, 12);

    for (const value of [0, 201, 2.5]) {
      const bad = await call('owner', 'PUT', `/workspaces/${wsA.id}/calendar`, {
        timezone: 'Asia/Jakarta',
        workingDays: [1, 2, 3, 4, 5],
        defaultWeeklyCapacityPoints: value,
      });
      assert.strictEqual(bad.status, 400, `value ${value}`);
    }
    const byPo = await call('po', 'PUT', `/workspaces/${wsA.id}/calendar`, {
      timezone: 'Asia/Jakarta',
      workingDays: [1, 2, 3, 4, 5],
      defaultWeeklyCapacityPoints: 30,
    });
    assert.strictEqual(byPo.status, 403);
  });

  test('AC-4.3: effective capacity = override, else smallest active Workspace default, else 15', async () => {
    await wsB.update({ defaultWeeklyCapacityPoints: 20 });
    let mine = await call('dev', 'GET', '/me/capacity');
    assert.strictEqual(mine.status, 200);
    // dev is in A (12), B (20) and Other (15 default) → smallest is 12.
    assert.deepStrictEqual(
      [mine.body.data.weeklyPoints, mine.body.data.effectiveWeeklyPoints, mine.body.data.source],
      [null, 12, 'workspace_default'],
    );

    // An archived Workspace no longer counts.
    await wsA.update({ archivedAt: new Date() });
    mine = await call('dev', 'GET', '/me/capacity');
    assert.strictEqual(mine.body.data.effectiveWeeklyPoints, 15);
    await wsA.update({ archivedAt: null });

    const set = await call('dev', 'PUT', '/me/capacity', { weeklyPoints: 9 });
    assert.strictEqual(set.status, 200);
    assert.deepStrictEqual(
      [set.body.data.weeklyPoints, set.body.data.effectiveWeeklyPoints, set.body.data.source],
      [9, 9, 'override'],
    );
    const cleared = await call('dev', 'PUT', '/me/capacity', { weeklyPoints: null });
    assert.deepStrictEqual(
      [cleared.body.data.weeklyPoints, cleared.body.data.effectiveWeeklyPoints],
      [null, 12],
    );

    const loner = await call('loner', 'GET', '/me/capacity');
    assert.deepStrictEqual(
      [loner.body.data.effectiveWeeklyPoints, loner.body.data.source],
      [15, 'system_default'],
    );

    const batch = await getEffectiveWeeklyCapacities([users.dev.id, users.loner.id]);
    assert.strictEqual(batch.get(users.dev.id)?.points, 12);
    assert.strictEqual(batch.get(users.loner.id)?.source, 'system_default');
  });

  test('AC-4.2: self or an Owner/Admin of a shared Workspace may edit; everyone else 403', async () => {
    const byOwner = await call('owner', 'PUT', `/users/${users.dev.id}/capacity`, {
      weeklyPoints: 10,
    });
    assert.strictEqual(byOwner.status, 200, JSON.stringify(byOwner.body));
    assert.strictEqual(byOwner.body.data.effectiveWeeklyPoints, 10);

    assert.strictEqual(
      (await call('po', 'PUT', `/users/${users.dev.id}/capacity`, { weeklyPoints: 5 })).status,
      403,
    );
    assert.strictEqual((await call('po', 'GET', `/users/${users.dev.id}/capacity`)).status, 403);
    // otherOwner leads wsOther, which dev belongs to → allowed; but not the PO who is only in A.
    assert.strictEqual(
      (await call('otherOwner', 'GET', `/users/${users.dev.id}/capacity`)).status,
      200,
    );
    assert.strictEqual(
      (await call('otherOwner', 'GET', `/users/${users.po.id}/capacity`)).status,
      403,
    );
    assert.strictEqual((await call('dev', 'GET', `/users/${users.owner.id}/capacity`)).status, 403);
    // Unknown and malformed ids look the same as "not allowed".
    assert.strictEqual(
      (await call('owner', 'GET', '/users/00000000-0000-4000-8000-000000000000/capacity')).status,
      403,
    );
    assert.strictEqual((await call('owner', 'GET', '/users/nope/capacity')).status, 403);
    assert.strictEqual((await call('dev', 'PUT', '/me/capacity', { weeklyPoints: 0 })).status, 400);
  });

  test('AC-4.4: time off stores only a date range; overlaps conflict; past ranges are hidden', async () => {
    const added = await call('dev', 'POST', '/me/time-off', {
      startDate: '2099-03-02',
      endDate: '2099-03-04',
      reason: 'tidak boleh tersimpan',
    });
    assert.strictEqual(added.status, 201, JSON.stringify(added.body));
    assert.deepStrictEqual(Object.keys(added.body.data).sort(), ['endDate', 'id', 'startDate']);
    const [columns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'user_time_off'`,
    );
    assert.ok(
      !(columns as { column_name: string }[]).some((c) => /reason|note/.test(c.column_name)),
    );

    assert.strictEqual(
      (
        await call('dev', 'POST', '/me/time-off', {
          startDate: '2099-03-05',
          endDate: '2099-03-01',
        })
      ).status,
      400,
    );
    assert.strictEqual(
      (
        await call('dev', 'POST', '/me/time-off', {
          startDate: '2099-03-04',
          endDate: '2099-03-06',
        })
      ).status,
      409,
    );
    const byOwner = await call('owner', 'POST', `/users/${users.dev.id}/time-off`, {
      startDate: '2099-04-01',
      endDate: '2099-04-01',
    });
    assert.strictEqual(byOwner.status, 201);
    assert.strictEqual(
      (
        await call('po', 'POST', `/users/${users.dev.id}/time-off`, {
          startDate: '2099-05-01',
          endDate: '2099-05-01',
        })
      ).status,
      403,
    );

    await UserTimeOffModel.create({
      userId: users.dev.id,
      startDate: '2020-01-01',
      endDate: '2020-01-02',
    });
    const listed = await call('dev', 'GET', '/me/capacity');
    assert.deepStrictEqual(
      listed.body.data.timeOff.map((item: { startDate: string }) => item.startDate),
      ['2099-03-02', '2099-04-01'],
    );

    assert.strictEqual(
      (await call('po', 'DELETE', `/users/${users.dev.id}/time-off/${added.body.data.id}`)).status,
      403,
    );
    assert.strictEqual(
      (await call('dev', 'DELETE', `/me/time-off/${added.body.data.id}`)).status,
      204,
    );
    assert.strictEqual(
      (await call('dev', 'DELETE', `/me/time-off/${added.body.data.id}`)).status,
      404,
    );
  });
});
