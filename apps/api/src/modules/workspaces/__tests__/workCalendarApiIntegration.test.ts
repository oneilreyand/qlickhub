import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  UserModel,
  WorkspaceHolidayModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * WORK-FOUNDATION P2 (ADR-044): Workspace work calendar over HTTP on PostgreSQL; no mocks.
 * AC-2.1 write/read-back, AC-2.2 non-manager 403, AC-2.3 defaults.
 */
describe('Workspace work calendar HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  const cookies: Record<string, string> = {};

  async function member(key: string, role: 'owner' | 'admin' | 'po' | 'dev' | 'qa') {
    const user = await UserModel.create({
      email: `${key}-calendar-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Calendar ${key}`,
      role: role === 'owner' ? 'admin' : role,
    });
    await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role });
    const sessionId = await sessionManager.createSession(user.id, 'WorkCalendarTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role: user.role, sessionId })}`;
    return user;
  }

  const call = (actor: string, method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}/workspaces/${workspace.id}${path}`, {
      method,
      headers: { Cookie: cookies[actor], 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
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
    const seedOwner = await UserModel.create({
      email: `seed-calendar-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Calendar seed',
      role: 'admin',
    });
    workspace = await WorkspaceModel.create({
      name: `Calendar ${stamp}`,
      slug: `calendar-${stamp}`,
      ownerId: seedOwner.id,
    });
    await member('owner', 'owner');
    await member('admin', 'admin');
    await member('po', 'po');
    await member('dev', 'dev');
    await member('qa', 'qa');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-2.3: a new Workspace uses Asia/Jakarta and Monday–Friday', async () => {
    const response = await call('dev', 'GET', '/calendar');
    assert.strictEqual(response.status, 200);
    const { data } = (await response.json()) as { data: unknown };
    assert.deepStrictEqual(data, {
      workspaceId: workspace.id,
      timezone: 'Asia/Jakarta',
      workingDays: [1, 2, 3, 4, 5],
      holidays: [],
    });
  });

  test('AC-2.1: Owner/Admin save time zone, working days and holidays; read back', async () => {
    const update = await call('admin', 'PUT', '/calendar', {
      timezone: 'Asia/Makassar',
      workingDays: [6, 1, 2, 3, 4, 5],
    });
    assert.strictEqual(update.status, 200);

    const christmas = await call('owner', 'POST', '/calendar/holidays', {
      date: '2026-12-25',
      name: 'Hari Raya Natal',
    });
    assert.strictEqual(christmas.status, 201);
    const created = ((await christmas.json()) as { data: { id: string } }).data;
    const newYear = await call('admin', 'POST', '/calendar/holidays', {
      date: '2027-01-01',
      name: 'Tahun Baru',
    });
    assert.strictEqual(newYear.status, 201);

    const duplicate = await call('admin', 'POST', '/calendar/holidays', {
      date: '2026-12-25',
      name: 'Dobel',
    });
    assert.strictEqual(duplicate.status, 409);

    const read = await call('qa', 'GET', '/calendar');
    const { data } = (await read.json()) as {
      data: { timezone: string; workingDays: number[]; holidays: { date: string; name: string }[] };
    };
    assert.strictEqual(data.timezone, 'Asia/Makassar');
    assert.deepStrictEqual(data.workingDays, [1, 2, 3, 4, 5, 6]);
    assert.deepStrictEqual(
      data.holidays.map((holiday) => [holiday.date, holiday.name]),
      [
        ['2026-12-25', 'Hari Raya Natal'],
        ['2027-01-01', 'Tahun Baru'],
      ],
    );

    const removed = await call('owner', 'DELETE', `/calendar/holidays/${created.id}`);
    assert.strictEqual(removed.status, 204);
    assert.strictEqual(
      await WorkspaceHolidayModel.count({ where: { workspaceId: workspace.id } }),
      1,
    );
    const missing = await call('owner', 'DELETE', `/calendar/holidays/${created.id}`);
    assert.strictEqual(missing.status, 404);
  });

  test('rejects an unknown time zone, empty working days and invalid dates', async () => {
    const badZone = await call('owner', 'PUT', '/calendar', {
      timezone: 'Mars/Olympus',
      workingDays: [1],
    });
    assert.strictEqual(badZone.status, 400);
    const noDays = await call('owner', 'PUT', '/calendar', {
      timezone: 'Asia/Jakarta',
      workingDays: [],
    });
    assert.strictEqual(noDays.status, 400);
    const badDate = await call('owner', 'POST', '/calendar/holidays', {
      date: '2026-02-30',
      name: 'Tidak ada',
    });
    assert.strictEqual(badDate.status, 400);
  });

  test('AC-2.2: PO, Developer and QA cannot change the calendar; data is unchanged', async () => {
    const before = await WorkspaceModel.findByPk(workspace.id);
    const holidaysBefore = await WorkspaceHolidayModel.count({
      where: { workspaceId: workspace.id },
    });
    for (const actor of ['po', 'dev', 'qa']) {
      const update = await call(actor, 'PUT', '/calendar', {
        timezone: 'UTC',
        workingDays: [1],
      });
      assert.strictEqual(update.status, 403, `${actor} PUT`);
      const add = await call(actor, 'POST', '/calendar/holidays', {
        date: '2027-03-01',
        name: 'Tidak boleh',
      });
      assert.strictEqual(add.status, 403, `${actor} POST`);
    }
    const after = await WorkspaceModel.findByPk(workspace.id);
    assert.strictEqual(after?.timezone, before?.timezone);
    assert.deepStrictEqual(after?.workingDays.map(Number), before?.workingDays.map(Number));
    assert.strictEqual(
      await WorkspaceHolidayModel.count({ where: { workspaceId: workspace.id } }),
      holidaysBefore,
    );
  });

  test('archived Workspace calendar is read-only', async () => {
    await workspace.update({ archivedAt: new Date() });
    try {
      const update = await call('owner', 'PUT', '/calendar', {
        timezone: 'Asia/Jakarta',
        workingDays: [1, 2, 3, 4, 5],
      });
      assert.strictEqual(update.status, 409);
    } finally {
      await workspace.update({ archivedAt: null });
    }
  });
});
