import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  UserCapacityModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { addDays } from '../../myWork/workReportRules.js';
import { currentWeek } from '../teamLoad.js';

/**
 * LEADER-PIPELINE-HUB P3 (ADR-044): team load in points vs capacity on PostgreSQL; no mocks.
 * AC-3.1: per specialty and per member, across all of a member's Workspaces, numbers by hand.
 */
describe('Leader team load HTTP / PostgreSQL Integration (LEADER-PIPELINE-HUB P3)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let wsA: WorkspaceModel;
  let wsB: WorkspaceModel;
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};
  const week = currentWeek('Asia/Jakarta', new Date());
  const friday = addDays(week.from, 4);
  const hiddenTitle = `Rahasia Workspace B ${stamp}`;

  async function member(
    key: string,
    workspace: WorkspaceModel,
    role: 'owner' | 'po' | 'dev' | 'qa',
  ) {
    if (!users[key]) {
      const user = await UserModel.create({
        email: `${key}-teamload-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: `Load ${key}`,
        role: role === 'owner' ? 'admin' : role,
      });
      const sessionId = await sessionManager.createSession(user.id, 'TeamLoad', '127.0.0.1');
      cookies[key] =
        `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role: user.role, sessionId })}`;
      users[key] = user;
    }
    return WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: users[key].id, role });
  }

  const subtask = (
    parent: TaskModel,
    title: string,
    assignee: string,
    effort: 'm' | 'l' | 'xl',
    status: 'todo' | 'in_progress' = 'in_progress',
  ) =>
    TaskModel.create({
      workspaceId: parent.workspaceId,
      parentTaskId: parent.id,
      deliveryArea: 'backend',
      title,
      status,
      priority: 'medium',
      reporterId: users.owner.id,
      assigneeId: users[assignee].id,
      startDate: week.from,
      dueDate: friday,
      effort,
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
    const seed = await UserModel.create({
      email: `seed-teamload-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Seed',
      role: 'admin',
    });
    wsA = await WorkspaceModel.create({
      name: `A Load ${stamp}`,
      slug: `a-load-${stamp}`,
      ownerId: seed.id,
    });
    wsB = await WorkspaceModel.create({
      name: `B Load ${stamp}`,
      slug: `b-load-${stamp}`,
      ownerId: seed.id,
    });
    await member('owner', wsA, 'owner');
    const devA = await member('dev', wsA, 'dev');
    await member('dev', wsB, 'dev');
    await member('qa', wsA, 'qa');
    await member('other', wsB, 'po');
    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: wsA.id,
      workspaceMemberId: devA.id,
      specialty: 'backend',
      createdBy: users.owner.id,
    });
    await UserCapacityModel.create({ userId: users.dev.id, weeklyPoints: 10 });

    const featureA = await TaskModel.create({
      workspaceId: wsA.id,
      title: `Feature A ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.owner.id,
    });
    const featureB = await TaskModel.create({
      workspaceId: wsB.id,
      title: `Feature B ${stamp}`,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.other.id,
    });
    await subtask(featureA, `API A ${stamp}`, 'dev', 'xl');
    await subtask(featureB, hiddenTitle, 'dev', 'l');
    await subtask(featureA, `QA A ${stamp}`, 'qa', 'm', 'todo');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-3.1: load per member and per area in points vs capacity, across all Workspaces', async () => {
    const response = await fetch(`${baseUrl}/leader/pipeline?workspaceIds=${wsA.id}`, {
      headers: { Cookie: cookies.owner },
    });
    assert.strictEqual(response.status, 200);
    const text = await response.text();
    const { data } = JSON.parse(text);
    assert.deepStrictEqual([data.teamLoad.weekFrom, data.teamLoad.weekTo], [week.from, week.to]);

    // dev: capacity 10 → 2/day. XL 8 ÷ 5 = 1.6 (A) + L 5 ÷ 5 = 1 (B, not led) = 2.6/day → 130%.
    // qa: default 15 → 3/day. M 3 ÷ 5 = 0.6/day → 20%.
    const byName = new Map(
      data.teamLoad.members.map((m: { name: string }) => [m.name, m] as [string, unknown]),
    );
    assert.deepStrictEqual(
      (({ area, percent, workspaceCount, weeklyCapacityPoints }) => ({
        area,
        percent,
        workspaceCount,
        weeklyCapacityPoints,
      }))(byName.get('Load dev') as Record<string, unknown>),
      { area: 'backend', percent: 130, workspaceCount: 2, weeklyCapacityPoints: 10 },
    );
    assert.strictEqual((byName.get('Load qa') as { percent: number }).percent, 20);
    assert.ok(!byName.has('Load owner'), 'leaders without work are not listed');
    assert.deepStrictEqual(
      data.teamLoad.areas.map((a: { key: string; percent: number }) => [a.key, a.percent]),
      [
        ['backend', 130],
        ['qa', 20],
      ],
    );

    // Work from a Workspace the leader does not lead counts, but its title never leaks.
    assert.ok(!text.includes(hiddenTitle));

    const feature = data.features.find(
      (f: { featureName: string }) => f.featureName === `Feature A ${stamp}`,
    );
    assert.strictEqual(feature.health, 'at_risk');
    assert.ok(
      feature.reasons.some(
        (r: { code: string; message: string }) =>
          r.code === 'assignee_over_capacity' && r.message.includes('130%'),
      ),
    );
  });
});
