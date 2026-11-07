import { NotificationModel } from '../../../db/models/notification.js';
import { NotificationOutboxModel } from '../../../db/models/notificationOutbox.js';
import { z } from 'zod';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { TaskSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { createTaskInTransaction } from '../internal/taskLifecycle.js';
import { featureSpecService } from '../../featureSpecs/featureSpecService.js';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  TaskActivityModel,
  FeatureSpecModel,
  FeatureSpecVersionModel,
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkFolderModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/** Contract-valid factories persisted in disposable PostgreSQL; no internal mocks. */
describe('F1 Feature/subtask schedule HTTP and PostgreSQL', () => {
  let server: Server;
  let base: string;
  let owner: UserModel;
  let workspace: WorkspaceModel;
  let cookie: string;
  before(async () => {
    await sequelize.authenticate();
    owner = await UserModel.create({
      email: `f1-${crypto.randomUUID()}@example.com`,
      name: 'Schedule planner fixture',
      passwordHash: 'fixture-only-hash',
      role: 'owner',
    });
    workspace = await WorkspaceModel.create({
      name: 'F1 persisted schedule fixture',
      slug: `f1-${crypto.randomUUID()}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    const sessionId = await sessionManager.createSession(owner.id, 'F1 fixture', '127.0.0.1');
    cookie = `${accessTokenCookieName}=${signToken({ userId: owner.id, email: owner.email, role: owner.role, sessionId })}`;
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}/v1/workspaces/${workspace.id}/tasks`;
  });
  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await sequelize.close();
  });
  const request = async (path: string, method = 'GET', body?: object) => {
    const response = await fetch(base + path, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const feature = async (scheduled = true) => {
    const result = await request('', 'POST', {
      title: 'Feature schedule fixture',
      ...(scheduled ? { startDate: '2026-11-01', dueDate: '2026-11-30' } : {}),
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return z.object({ data: TaskSchema }).parse(result.body).data;
  };
  const child = async (
    root: TaskModel | { id: string },
    dates = { startDate: '2026-11-05', dueDate: '2026-11-20' },
  ) => {
    const result = await request(`/${root.id}/subtasks`, 'POST', {
      title: 'Integrasi API fixture',
      deliveryArea: 'backend',
      assigneeId: owner.id,
      ...dates,
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return z.object({ data: TaskSchema }).parse(result.body).data;
  };
  test('AC-F1.1 shrink rejects 409 with child/date and no root or audit write', async () => {
    const root = await feature();
    const sub = await child(root);
    const before = await TaskModel.findByPk(root.id);
    const audit = await TaskActivityModel.count({ where: { workspaceId: workspace.id } });
    const notices = await NotificationModel.count({ where: { workspaceId: workspace.id } });
    const outbox = await NotificationOutboxModel.count({ where: { workspaceId: workspace.id } });
    const result = await request(`/${root.id}`, 'PATCH', {
      dueDate: '2026-11-15',
      title: 'Must roll back',
    });
    assert.equal(result.status, 409, JSON.stringify(result.body));
    assert.equal(
      z.object({ code: z.string() }).parse(result.body).code,
      'FEATURE_SCHEDULE_CONFLICT',
    );
    assert.match(JSON.stringify(result.body), /Integrasi API fixture/);
    assert.match(JSON.stringify(result.body), /2026-11-20/);
    const after = await TaskModel.findByPk(root.id);
    assert.equal(after?.dueDate, before?.dueDate);
    assert.equal(after?.title, before?.title);
    assert.equal(await TaskActivityModel.count({ where: { workspaceId: workspace.id } }), audit);
    assert.equal(await NotificationModel.count({ where: { workspaceId: workspace.id } }), notices);
    assert.equal(
      await NotificationOutboxModel.count({ where: { workspaceId: workspace.id } }),
      outbox,
    );
    assert.ok(await TaskModel.findByPk(sub.id));
  });
  test('AC-F1.2 create and update child outside range reject 400 with range', async () => {
    const root = await feature();
    const count = await TaskModel.count({ where: { parentTaskId: root.id } });
    const result = await request(`/${root.id}/subtasks`, 'POST', {
      title: 'Invalid fixture',
      deliveryArea: 'backend',
      assigneeId: owner.id,
      startDate: '2026-11-25',
      dueDate: '2026-12-05',
    });
    assert.equal(result.status, 400);
    assert.equal(
      z.object({ code: z.string() }).parse(result.body).code,
      'SUBTASK_SCHEDULE_OUT_OF_RANGE',
    );
    assert.match(JSON.stringify(result.body), /2026-11-30/);
    assert.equal(await TaskModel.count({ where: { parentTaskId: root.id } }), count);
    const sub = await child(root);
    assert.equal((await request(`/${sub.id}`, 'PATCH', { startDate: '2026-10-31' })).status, 400);
    assert.equal((await TaskModel.findByPk(sub.id))?.startDate, '2026-11-05');
  });
  test('AC-F1.1 combined folder and schedule failure preserves root, children and audit', async () => {
    const root = await feature();
    const sub = await child(root);
    const folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'F1 move target fixture',
      createdBy: owner.id,
    });
    const audit = await TaskActivityModel.count({ where: { workspaceId: workspace.id } });
    const result = await request(`/${root.id}`, 'PATCH', {
      folderId: folder.id,
      dueDate: '2026-11-15',
      title: 'Must not persist fixture',
    });
    assert.equal(result.status, 409);
    const persisted = await TaskModel.findByPk(root.id);
    assert.equal(persisted?.folderId, null);
    assert.equal(persisted?.dueDate, root.dueDate);
    assert.equal(persisted?.title, root.title);
    assert.equal((await TaskModel.findByPk(sub.id))?.folderId, null);
    assert.equal(await TaskActivityModel.count({ where: { workspaceId: workspace.id } }), audit);
    assert.equal(
      (
        await request(`/${root.id}`, 'PATCH', {
          folderId: folder.id,
          dueDate: '2026-11-25',
        })
      ).status,
      200,
    );
    assert.equal((await TaskModel.findByPk(root.id))?.folderId, folder.id);
    assert.equal((await TaskModel.findByPk(sub.id))?.folderId, folder.id);
  });

  test('AC-F1.6/.11 assignment responses retain backend legacy constraint on release, claim and reassign', async () => {
    const root = await feature();
    const sub = await child(root);
    await TaskModel.update({ dueDate: '2026-12-05' }, { where: { id: sub.id } }); // Persisted legacy factory.
    const dev = await UserModel.create({
      email: `f1-${crypto.randomUUID()}@example.com`,
      passwordHash: 'fixture-only-hash',
      name: 'F1 assignment fixture',
      role: 'dev',
    });
    const member = await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: dev.id,
      role: 'dev',
    });
    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: workspace.id,
      workspaceMemberId: member.id,
      specialty: 'backend',
      createdBy: owner.id,
    });
    const sessionId = await sessionManager.createSession(
      dev.id,
      'F1 assignment fixture',
      '127.0.0.1',
    );
    const devCookie = `${accessTokenCookieName}=${signToken({ userId: dev.id, email: dev.email, role: dev.role, sessionId })}`;
    for (const action of ['release', 'claim', 'reassign'] as const) {
      const before = await TaskModel.findByPk(sub.id);
      assert.ok(before);
      const response = await fetch(`${base}/${sub.id}/${action}`, {
        method: 'POST',
        headers: {
          Cookie: action === 'claim' ? devCookie : cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: before.updatedAt.toISOString(),
          ...(action === 'reassign' ? { assigneeId: owner.id } : {}),
        }),
      });
      const body = await response.json();
      assert.equal(response.status, 200, JSON.stringify(body));
      const task = z.object({ data: TaskSchema }).parse(body).data;
      assert.equal(task.featureScheduleConstraint?.status, 'outside', action);
      assert.equal(task.featureScheduleConstraint?.featureDueDate, root.dueDate);
      assert.equal(task.dueDate, '2026-12-05');
      const persisted = await TaskModel.findByPk(sub.id);
      assert.equal(persisted?.dueDate, '2026-12-05');
      assert.equal(
        persisted?.assigneeId,
        action === 'release' ? null : action === 'claim' ? dev.id : owner.id,
      );
      assert.equal(
        await TaskActivityModel.count({
          where: {
            taskId: sub.id,
            action: `task.${action === 'reassign' ? 'reassigned' : action === 'claim' ? 'claimed' : 'released'}`,
          },
        }),
        1,
      );
    }
  });
  test('AC-F1.3 terminal children ignored; L2 out-of-range reopen rejected', async () => {
    for (const status of ['done', 'canceled'] as const) {
      const root = await feature();
      const sub = await child(root);
      await TaskModel.update({ status }, { where: { id: sub.id } }); // Persisted terminal fixture, not a mocked transition.
      const rootAudit = await TaskActivityModel.count({ where: { taskId: root.id } });
      assert.equal((await request(`/${root.id}`, 'PATCH', { dueDate: '2026-11-15' })).status, 200);
      assert.equal(await TaskActivityModel.count({ where: { taskId: root.id } }), rootAudit + 1);
      assert.equal((await request(`/${sub.id}`, 'PATCH', { status: 'todo' })).status, 400);
      assert.equal((await TaskModel.findByPk(sub.id))?.status, status);
    }
  });
  test('AC-F1.4/.5 inclusive bounds and unscheduled parent/child remain valid', async () => {
    const root = await feature();
    const sub = await child(root, { startDate: '2026-11-01', dueDate: '2026-11-30' });
    assert.equal(sub.startDate, '2026-11-01');
    const unbounded = await feature(false);
    const unlimitedChild = await child(unbounded, {
      startDate: '2026-10-01',
      dueDate: '2026-12-01',
    });
    const unscheduled = await request(`/${root.id}/subtasks`, 'POST', {
      title: 'Unscheduled fixture',
      deliveryArea: 'backend',
      assigneeId: owner.id,
    });
    assert.equal(unscheduled.status, 201);
    assert.equal(
      z.object({ data: TaskSchema }).parse(unscheduled.body).data.featureScheduleConstraint?.status,
      'unscheduled',
    );
    assert.equal(unlimitedChild.featureScheduleConstraint?.status, 'unbounded');
  });
  test('AC-F1.6 legacy read is flagged without mutation; metadata edit allowed; date edit strict', async () => {
    const root = await feature();
    const sub = await child(root);
    await TaskModel.update({ dueDate: '2026-12-05' }, { where: { id: sub.id } }); // Persisted legacy factory.
    const before = await TaskModel.findByPk(sub.id);
    const result = await request(`/${sub.id}`);
    assert.equal(result.status, 200);
    const record = z.object({ data: TaskSchema }).parse(result.body).data;
    assert.equal(record.featureScheduleConstraint?.status, 'outside');
    assert.equal(
      (await TaskModel.findByPk(sub.id))?.updatedAt.toISOString(),
      before?.updatedAt.toISOString(),
    );
    assert.equal(
      (await request(`/${sub.id}`, 'PATCH', { title: 'Metadata only', status: 'in_progress' }))
        .status,
      200,
    );
    assert.equal((await request(`/${sub.id}`, 'PATCH', { dueDate: '2026-12-01' })).status, 400);
    assert.equal((await request(`/${sub.id}`, 'PATCH', { dueDate: '2026-11-30' })).status, 200);
  });
  test('AC-F1.7 expansion accepted; start shrink rejected', async () => {
    const root = await feature();
    await child(root);
    assert.equal(
      (await request(`/${root.id}`, 'PATCH', { startDate: '2026-10-01', dueDate: '2026-12-01' }))
        .status,
      200,
    );
    assert.equal((await request(`/${root.id}`, 'PATCH', { startDate: '2026-11-10' })).status, 409);
  });
  test('AC-F1.8 Plan sync rejects atomically, preserving spec version/history and root', async () => {
    let spec = await featureSpecService.create(owner.id, {
      workspaceId: workspace.id,
      title: 'Plan constraint fixture',
      idea: 'Keep delivery schedule consistent.',
    });
    spec = await featureSpecService.saveSection(owner.id, {
      workspaceId: workspace.id,
      specId: spec.id,
      version: spec.version,
      section: 'plan',
      content: { title: spec.plan.title, startDate: '2026-11-01', dueDate: '2026-11-30' },
      complete: false,
    });
    await child({ id: spec.featureTaskId });
    const count = await FeatureSpecVersionModel.count({ where: { specId: spec.id } });
    const audit = await TaskActivityModel.count({ where: { taskId: spec.featureTaskId } });
    await assert.rejects(
      featureSpecService.saveSection(owner.id, {
        workspaceId: workspace.id,
        specId: spec.id,
        version: spec.version,
        section: 'plan',
        content: { ...spec.plan, dueDate: '2026-11-15' },
        complete: false,
      }),
      /CONFLICT:.*Integrasi API fixture/,
    );
    assert.equal((await FeatureSpecModel.findByPk(spec.id))?.version, spec.version);
    assert.equal(await FeatureSpecVersionModel.count({ where: { specId: spec.id } }), count);
    assert.equal(await TaskActivityModel.count({ where: { taskId: spec.featureTaskId } }), audit);
    assert.equal((await TaskModel.findByPk(spec.featureTaskId))?.dueDate, '2026-11-30');
  });

  test('AC-F1.9 denied planning edits do not leak schedule conflicts; other Feature isolated', async () => {
    const root = await feature();
    const sub = await child(root);
    for (const role of ['dev', 'qa'] as const) {
      const user = await UserModel.create({
        email: `f1-${crypto.randomUUID()}@example.com`,
        passwordHash: 'fixture-only-hash',
        name: 'Denied planner fixture',
        role,
      });
      await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role });
      const sessionId = await sessionManager.createSession(user.id, 'F1 deny fixture', '127.0.0.1');
      const deniedCookie = `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role, sessionId })}`;
      const response = await fetch(`${base}/${sub.id}`, {
        method: 'PATCH',
        headers: { Cookie: deniedCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: '2026-12-01' }),
      });
      assert.equal(response.status, 403);
      assert.doesNotMatch(await response.text(), /2026-11-30|Integrasi API fixture/);
    }
    const other = await feature();
    assert.equal((await request(`/${other.id}`, 'PATCH', { dueDate: '2026-11-02' })).status, 200);
    const otherWorkspace = await WorkspaceModel.create({
      name: 'Other schedule fixture',
      slug: `f1-${crypto.randomUUID()}`,
      ownerId: owner.id,
    });
    const foreign = await TaskModel.create({
      workspaceId: otherWorkspace.id,
      title: 'Private other Feature',
      reporterId: owner.id,
      startDate: '2026-10-01',
      dueDate: '2026-12-31',
    });
    const foreignResponse = await request(`/${foreign.id}`, 'PATCH', { dueDate: '2026-11-02' });
    assert.equal(foreignResponse.status, 404);
    assert.doesNotMatch(JSON.stringify(foreignResponse.body), /Private other Feature|2026-12-31/);
  });

  async function waitForBlockedWriter(rootId: string) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const rows = await sequelize.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE :root",
        { type: QueryTypes.SELECT, replacements: { root: `%${rootId}%` } },
      );
      if (rows[0].count > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.fail('Expected the concurrent writer to wait on the PostgreSQL root lock');
  }
  test('AC-F1.10 concurrent child creation then root shrink cannot bypass root lock', async () => {
    const root = await feature();
    const transaction = await sequelize.transaction();
    let pending: ReturnType<typeof request> | undefined;
    let committed = false;
    try {
      await createTaskInTransaction(
        owner.id,
        {
          workspaceId: workspace.id,
          parentTaskId: root.id,
          title: 'Concurrent persisted child fixture',
          deliveryArea: 'backend',
          assigneeId: owner.id,
          startDate: '2026-11-05',
          dueDate: '2026-11-20',
          status: 'todo',
          priority: 'medium',
        },
        transaction,
      );
      pending = request(`/${root.id}`, 'PATCH', { dueDate: '2026-11-15' });
      await waitForBlockedWriter(root.id);
      await transaction.commit();
      committed = true;
      assert.equal((await pending).status, 409);
      assert.equal((await TaskModel.findByPk(root.id))?.dueDate, '2026-11-30');
    } finally {
      if (!committed) await transaction.rollback();
      if (pending) await pending;
    }
  });
  test('AC-F1.10 concurrent root update then child creation uses the committed range', async () => {
    const root = await feature();
    const transaction = await sequelize.transaction();
    let pending: ReturnType<typeof request> | undefined;
    let committed = false;
    try {
      // Persisted transaction barrier: root writer has committed neither its row nor lock yet.
      await TaskModel.update({ dueDate: '2026-11-15' }, { where: { id: root.id }, transaction });
      pending = request(`/${root.id}/subtasks`, 'POST', {
        title: 'Racing child fixture',
        deliveryArea: 'backend',
        assigneeId: owner.id,
        startDate: '2026-11-05',
        dueDate: '2026-11-20',
      });
      await waitForBlockedWriter(root.id);
      await transaction.commit();
      committed = true;
      assert.equal((await pending).status, 400);
      assert.equal(await TaskModel.count({ where: { parentTaskId: root.id } }), 0);
    } finally {
      if (!committed) await transaction.rollback();
      if (pending) await pending;
    }
  });
  test('batch metadata preserves pagination and uses constant query count without read writes', async () => {
    const root = await feature();
    for (let i = 0; i < 5; i++) await child(root);
    const audit = await TaskActivityModel.count({ where: { taskId: root.id } });
    const counts: number[] = [];
    for (const limit of [1, 5]) {
      let count = 0;
      const hook = () => {
        count++;
      };
      sequelize.addHook('beforeQuery', 'f1-query-counter', hook);
      try {
        const result = await request(`/${root.id}/subtasks?limit=${limit}`);
        assert.equal(result.status, 200);
        const data = z
          .object({ data: z.object({ tasks: z.array(TaskSchema), total: z.number() }) })
          .parse(result.body).data;
        assert.equal(data.total, 5);
        assert.equal(data.tasks.length, limit);
        assert.ok(data.tasks.every((t) => t.featureScheduleConstraint?.status === 'within'));
      } finally {
        sequelize.removeHook('beforeQuery', 'f1-query-counter');
      }
      counts.push(count);
    }
    console.log('F1 read queries at page sizes 1/5:', counts);
    assert.equal(counts[0], counts[1], 'Page size must not add a parent query per child');
    assert.equal(await TaskActivityModel.count({ where: { taskId: root.id } }), audit);
  });
  test('nested subtasks keep their existing 400 contract', async () => {
    const root = await feature();
    const sub = await child(root);
    const result = await request(`/${sub.id}/subtasks`, 'POST', {
      title: 'Nested fixture rejected',
      deliveryArea: 'backend',
      assigneeId: owner.id,
    });
    assert.equal(result.status, 400);
    assert.equal(await TaskModel.count({ where: { parentTaskId: sub.id } }), 0);
  });

  test('AC-F1.10 concurrent root shrink then child date update reloads both rows', async () => {
    const root = await feature();
    const sub = await child(root, { startDate: '2026-11-05', dueDate: '2026-11-10' });
    const audit = await TaskActivityModel.count({ where: { taskId: sub.id } });
    const transaction = await sequelize.transaction();
    let committed = false;
    let pending: ReturnType<typeof request> | undefined;
    try {
      await TaskModel.update({ dueDate: '2026-11-15' }, { where: { id: root.id }, transaction });
      pending = request(`/${sub.id}`, 'PATCH', { dueDate: '2026-11-20' });
      await waitForBlockedWriter(root.id);
      await transaction.commit();
      committed = true;
      assert.equal((await pending).status, 400);
      assert.equal((await TaskModel.findByPk(sub.id))?.dueDate, '2026-11-10');
      assert.equal(await TaskActivityModel.count({ where: { taskId: sub.id } }), audit);
    } finally {
      if (!committed) await transaction.rollback();
      if (pending) await pending;
    }
  });
  test('legacy metadata also covers children embedded by includeSubtasks', async () => {
    const root = await feature();
    const sub = await child(root);
    await TaskModel.update({ dueDate: '2026-12-05' }, { where: { id: sub.id } }); // Persisted legacy factory.
    const result = await request(`?includeSubtasks=true&search=${root.id}`);
    assert.equal(result.status, 200);
    const data = z
      .object({ data: z.object({ tasks: z.array(TaskSchema) }) })
      .parse(result.body).data;
    const embedded = data.tasks
      .find((t) => t.id === root.id)
      ?.subtasks?.find((t) => t.id === sub.id);
    assert.ok(embedded);
    assert.equal(embedded.featureScheduleConstraint?.status, 'outside');
    assert.equal(embedded.featureScheduleConstraint.featureDueDate, '2026-11-30');
  });
});
