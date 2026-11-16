import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskLinkModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * AUTH-013 / ADR-043: task-scoped reads follow task-level access (Phase 1 and Phase 2). Persisted
 * factories on the disposable PostgreSQL test database; no mocks.
 */
describe('Task-scoped read access HTTP / PostgreSQL Integration (AUTH-013)', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let feature: TaskModel;
  let devSubtask: TaskModel;
  let qaSubtask: TaskModel;
  let reportedByQa: TaskModel;
  const cookies: Record<string, string> = {};

  const GATED_READS = ['links', 'product-brief', 'documents', 'activity', 'attachments'] as const;
  // Acceptance checks exist only on a Developer Subtask, so the allowed case is asserted there.
  const SUBTASK_ONLY_READ = 'acceptance-checks';

  async function createMember(
    key: string,
    role: 'owner' | 'po' | 'dev' | 'qa',
  ): Promise<UserModel> {
    const user = await UserModel.create({
      email: `${key}-read-access-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Read Access ${key}`,
      role: role === 'owner' ? 'admin' : role,
    });
    await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role });
    const sessionId = await sessionManager.createSession(
      user.id,
      'TaskReadAccessIntegration',
      '127.0.0.1',
    );
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role: user.role, sessionId })}`;
    return user;
  }

  const read = (actor: string, taskId: string, path: string) =>
    fetch(`${baseUrl}/workspaces/${workspace.id}/tasks/${taskId}/${path}`, {
      headers: { Cookie: cookies[actor] },
    });

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

    const ownerUser = await UserModel.create({
      email: `owner-read-access-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Read Access owner seed',
      role: 'admin',
    });
    workspace = await WorkspaceModel.create({
      name: `Read Access Workspace ${stamp}`,
      slug: `read-access-ws-${stamp}`,
      ownerId: ownerUser.id,
    });

    const po = await createMember('po', 'po');
    const devAssigned = await createMember('devAssigned', 'dev');
    const qaAssigned = await createMember('qaAssigned', 'qa');
    await createMember('devOther', 'dev');
    const qaOther = await createMember('qaOther', 'qa');

    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Read access Feature',
      status: 'todo',
      priority: 'medium',
      reporterId: po.id,
    });
    devSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'backend',
      title: 'Read access backend subtask',
      status: 'todo',
      priority: 'medium',
      reporterId: po.id,
      assigneeId: devAssigned.id,
    });
    qaSubtask = await TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      deliveryArea: 'qa',
      title: 'Read access QA subtask',
      status: 'todo',
      priority: 'medium',
      reporterId: po.id,
      assigneeId: qaAssigned.id,
    });
    reportedByQa = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Read access Feature reported by QA',
      status: 'todo',
      priority: 'medium',
      reporterId: qaOther.id,
    });
    await TaskLinkModel.create({
      workspaceId: workspace.id,
      taskId: feature.id,
      title: 'Read access reference',
      url: 'https://example.com/read-access',
      linkType: 'other',
      sortOrder: 0,
      createdBy: po.id,
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('Developer/QA without work on the Feature cannot read its task-scoped data', async () => {
    for (const actor of ['devOther', 'qaOther']) {
      for (const taskId of [feature.id, devSubtask.id]) {
        const detail = await read(actor, taskId, '');
        assert.strictEqual(detail.status, 403, `${actor} task detail`);
        for (const path of [...GATED_READS, SUBTASK_ONLY_READ]) {
          const res = await read(actor, taskId, path);
          assert.strictEqual(res.status, 403, `${actor} ${path}`);
          const body = (await res.json()) as { code?: string };
          assert.strictEqual(body.code, 'FORBIDDEN', `${actor} ${path} code`);
        }
      }
    }
  });

  test('Developer/QA holding a Subtask read the Feature and its sibling Subtasks', async () => {
    for (const actor of ['devAssigned', 'qaAssigned']) {
      for (const taskId of [feature.id, devSubtask.id, qaSubtask.id]) {
        for (const path of GATED_READS) {
          const res = await read(actor, taskId, path);
          assert.strictEqual(res.status, 200, `${actor} ${path} on ${taskId}`);
        }
      }
      const checks = await read(actor, devSubtask.id, SUBTASK_ONLY_READ);
      assert.strictEqual(checks.status, 200, `${actor} ${SUBTASK_ONLY_READ}`);
    }
    const links = (await (await read('qaAssigned', feature.id, 'links')).json()) as {
      data: Array<{ title: string }>;
    };
    assert.deepStrictEqual(
      links.data.map((link) => link.title),
      ['Read access reference'],
    );
  });

  test('Planners read every task; the reporter reads their own task', async () => {
    for (const path of GATED_READS) {
      assert.strictEqual((await read('po', feature.id, path)).status, 200, `po ${path}`);
      assert.strictEqual(
        (await read('qaOther', reportedByQa.id, path)).status,
        200,
        `reporter ${path}`,
      );
    }
  });

  // Phase 2 (ADR-043): requirement links, delivery trace, test executions, release records,
  // readiness, findings and handoffs of a Feature follow the same rule.
  const PHASE_2_READS = [
    'tasks/:id/requirements',
    'tasks/:id/delivery-trace',
    'tasks/:id/test-executions',
    'features/:id/release-records',
    'features/:id/readiness',
    'features/:id/readiness/findings',
    'features/:id/handoffs',
  ] as const;
  const readFeatureScoped = (actor: string, template: string) =>
    fetch(`${baseUrl}/workspaces/${workspace.id}/${template.replace(':id', feature.id)}`, {
      headers: { Cookie: cookies[actor] },
    });

  test('Phase 2 reads of a Feature are denied without task access and allowed with it', async () => {
    for (const template of PHASE_2_READS) {
      for (const actor of ['devOther', 'qaOther']) {
        const res = await readFeatureScoped(actor, template);
        assert.strictEqual(res.status, 403, `${actor} ${template}`);
        const body = (await res.json()) as { code?: string };
        assert.strictEqual(body.code, 'FORBIDDEN', `${actor} ${template} code`);
      }
      for (const actor of ['po', 'devAssigned', 'qaAssigned']) {
        const res = await readFeatureScoped(actor, template);
        assert.strictEqual(res.status, 200, `${actor} ${template}`);
      }
    }
  });

  test('Subtask-level readiness and QA workflow reads follow task access', async () => {
    const subtaskRead = (actor: string, taskId: string, path: string) =>
      fetch(`${baseUrl}/workspaces/${workspace.id}/tasks/${taskId}/${path}`, {
        headers: { Cookie: cookies[actor] },
      });

    // Developer readiness is defined on a QA Subtask and already resolves the task with the actor.
    const readinessDenied = await subtaskRead('devOther', qaSubtask.id, 'developer-readiness');
    assert.strictEqual(readinessDenied.status, 403);
    const readinessAllowed = await subtaskRead('qaAssigned', qaSubtask.id, 'developer-readiness');
    assert.strictEqual(readinessAllowed.status, 200);

    const qaDenied = await subtaskRead('qaOther', qaSubtask.id, 'qa-workflow-summary');
    assert.strictEqual(qaDenied.status, 403);
    const qaAllowed = await subtaskRead('qaAssigned', qaSubtask.id, 'qa-workflow-summary');
    assert.strictEqual(qaAllowed.status, 200);
  });

  test('Discussion reads follow task access (ADR-043, Owner decision 2026-11-16)', async () => {
    for (const actor of ['devOther', 'qaOther']) {
      const res = await read(actor, feature.id, 'comments');
      assert.strictEqual(res.status, 403, `${actor} comments`);
    }
    for (const actor of ['po', 'devAssigned', 'qaAssigned']) {
      const res = await read(actor, feature.id, 'comments');
      assert.strictEqual(res.status, 200, `${actor} comments`);
    }
  });

  test('A task that does not exist in the Workspace is left to the route handler', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const asDeveloper = await read('devOther', missing, 'links');
    const asPlanner = await read('po', missing, 'links');
    // The access check adds no 403 here and does not change the handler's own answer.
    assert.notStrictEqual(asDeveloper.status, 403);
    assert.strictEqual(asDeveloper.status, asPlanner.status);
  });
});
