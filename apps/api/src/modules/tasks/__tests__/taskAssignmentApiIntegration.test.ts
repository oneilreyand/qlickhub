import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import {
  RoleAwareWorkQueueSchema,
  TaskSchema,
  type DeliveryArea,
  type TaskStatus,
} from '@qlick/contracts';
import { createApp } from '../../../app.js';
import {
  NotificationModel,
  TaskActivityModel,
  TaskCommentModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * P5g-2 / AC-5.10 (ADR-038). Persisted PostgreSQL factories only: members, specialties,
 * Feature roots and open/assigned subtasks are real rows, every mutation goes through the
 * authenticated HTTP interface, and outcomes are read back from the database.
 */
describe('Task assignment: claim, release, reassign (P5g-2, PostgreSQL)', () => {
  let server: Server;
  let base = '';
  let workspace: WorkspaceModel;
  let feature: TaskModel;
  const users: Record<string, UserModel> = {};
  const cookies = new Map<string, string>();
  const stamp = Date.now();

  const roster = [
    { key: 'owner', role: 'owner', specialties: [] },
    { key: 'po', role: 'po', specialties: [] },
    { key: 'devBackend', role: 'dev', specialties: ['backend'] },
    { key: 'devFrontend', role: 'dev', specialties: ['frontend'] },
    { key: 'devFullstack', role: 'dev', specialties: ['fullstack'] },
    { key: 'devUnclassified', role: 'dev', specialties: [] },
    { key: 'qa', role: 'qa', specialties: [] },
    { key: 'outsider', role: 'dev', specialties: [] },
  ] as const;

  before(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}/v1`;

    for (const [index, entry] of roster.entries()) {
      users[entry.key] = await UserModel.create({
        email: `p5g2-${stamp}-${index}@example.com`,
        passwordHash: 'test-only-hash',
        name: `P5g2 fixture ${entry.key}`,
        role: entry.role,
      });
    }
    workspace = await WorkspaceModel.create({
      name: `P5g2 fixture ${stamp}`,
      slug: `p5g2-${stamp}`,
      ownerId: users.owner.id,
    });
    for (const entry of roster) {
      if (entry.key === 'outsider') continue;
      const member = await WorkspaceMemberModel.create({
        workspaceId: workspace.id,
        userId: users[entry.key].id,
        role: entry.role,
      });
      for (const specialty of entry.specialties) {
        await WorkspaceMemberSpecialtyModel.create({
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
          specialty,
          createdBy: users.owner.id,
        });
      }
    }
    for (const user of Object.values(users)) {
      const sessionId = await sessionManager.createSession(user.id, 'P5g2 fixture', '127.0.0.1');
      cookies.set(
        user.id,
        `${accessTokenCookieName}=${signToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId,
        })}`,
      );
    }
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'P5g2 Feature checkout',
      reporterId: users.po.id,
      status: 'in_progress',
      priority: 'high',
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (workspace) {
      const where = { workspaceId: workspace.id };
      await NotificationModel.destroy({ where });
      await TaskCommentModel.destroy({ where, force: true });
      await TaskActivityModel.destroy({ where });
      await TaskModel.destroy({ where, force: true });
      await WorkspaceMembershipActivityModel.destroy({ where });
      await WorkspaceMemberSpecialtyModel.destroy({ where });
      await WorkspaceMemberModel.destroy({ where });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    await UserModel.destroy({ where: { id: Object.values(users).map((user) => user.id) } });
  });

  async function subtask(input: {
    title: string;
    deliveryArea: DeliveryArea;
    mode?: 'open' | 'assigned';
    assigneeId?: string | null;
    status?: TaskStatus;
  }): Promise<TaskModel> {
    return TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      title: input.title,
      deliveryArea: input.deliveryArea,
      reporterId: users.po.id,
      status: input.status ?? 'todo',
      priority: 'medium',
      assigneeId: input.assigneeId ?? null,
      assignmentMode: input.mode ?? 'open',
      startDate: '2026-11-04',
      dueDate: '2026-11-12',
    });
  }

  function post(actorKey: string | null, taskId: string, action: string, body: unknown) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (actorKey) headers.Cookie = cookies.get(users[actorKey].id)!;
    return fetch(`${base}/workspaces/${workspace.id}/tasks/${taskId}/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  const version = (task: TaskModel) => ({ expectedUpdatedAt: task.updatedAt.toISOString() });

  async function activities(taskId: string, action: string) {
    return TaskActivityModel.findAll({
      where: { workspaceId: workspace.id, taskId, action },
      order: [['createdAt', 'ASC']],
    });
  }

  async function queueFor(actorKey: string) {
    const response = await fetch(`${base}/workspaces/${workspace.id}/my-work-queue`, {
      headers: { Cookie: cookies.get(users[actorKey].id)! },
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { queue: unknown };
    return RoleAwareWorkQueueSchema.parse(body.queue);
  }

  test('rejects unauthenticated, non-member, planner, and mismatched claims without writing', async () => {
    const backend = await subtask({ title: 'Open backend API', deliveryArea: 'backend' });
    const qaWork = await subtask({ title: 'Open QA pass', deliveryArea: 'qa' });

    assert.equal((await post(null, backend.id, 'claim', version(backend))).status, 401);
    assert.equal((await post('outsider', backend.id, 'claim', version(backend))).status, 403);
    assert.equal((await post('po', backend.id, 'claim', version(backend))).status, 403);
    assert.equal((await post('owner', backend.id, 'claim', version(backend))).status, 403);
    assert.equal((await post('devFrontend', backend.id, 'claim', version(backend))).status, 403);
    assert.equal((await post('qa', backend.id, 'claim', version(backend))).status, 403);
    assert.equal((await post('devBackend', qaWork.id, 'claim', version(qaWork))).status, 403);
    const unclassified = await post('devUnclassified', backend.id, 'claim', version(backend));
    assert.equal(unclassified.status, 403);
    assert.match(((await unclassified.json()) as { detail: string }).detail, /specialty/i);
    assert.equal((await post('devBackend', backend.id, 'claim', {})).status, 400);

    for (const row of [backend, qaWork]) {
      await row.reload();
      assert.equal(row.assigneeId, null);
      assert.equal(row.assignmentMode, 'open');
      assert.equal((await activities(row.id, 'task.claimed')).length, 0);
    }
  });

  test('a matching Developer claims atomically, keeps status, and writes one audit row', async () => {
    const frontend = await subtask({
      title: 'Open checkout form',
      deliveryArea: 'frontend',
      status: 'in_progress',
    });
    const response = await post('devFullstack', frontend.id, 'claim', version(frontend));
    assert.equal(response.status, 200);
    const returned = TaskSchema.parse(((await response.json()) as { data: unknown }).data);
    assert.equal(returned.assigneeId, users.devFullstack.id);
    assert.equal(returned.assignmentMode, 'assigned');

    await frontend.reload();
    assert.equal(frontend.assigneeId, users.devFullstack.id);
    assert.equal(frontend.assignmentMode, 'assigned');
    assert.equal(frontend.status, 'in_progress');
    const audit = await activities(frontend.id, 'task.claimed');
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actorId, users.devFullstack.id);
    assert.deepEqual(
      {
        channel: audit[0].metadataJson?.channel,
        from: audit[0].metadataJson?.fromAssigneeId,
        to: audit[0].metadataJson?.toAssigneeId,
        status: audit[0].metadataJson?.status,
      },
      { channel: 'claim', from: null, to: users.devFullstack.id, status: 'in_progress' },
    );

    // The claimer can now read it through the normal Task interface.
    const read = await fetch(`${base}/workspaces/${workspace.id}/tasks/${frontend.id}`, {
      headers: { Cookie: cookies.get(users.devFullstack.id)! },
    });
    assert.equal(read.status, 200);
  });

  test('two simultaneous claims produce exactly one 200 and one 409', async () => {
    const backend = await subtask({ title: 'Open payment webhook', deliveryArea: 'backend' });
    const body = version(backend);
    const [left, right] = await Promise.all([
      post('devBackend', backend.id, 'claim', body),
      post('devFullstack', backend.id, 'claim', body),
    ]);
    assert.deepEqual([left.status, right.status].sort(), [200, 409]);
    const winner = left.status === 200 ? users.devBackend.id : users.devFullstack.id;
    await backend.reload();
    assert.equal(backend.assigneeId, winner);
    const audit = await activities(backend.id, 'task.claimed');
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actorId, winner);
  });

  test('stale versions and closed subtasks return 409 without a write', async () => {
    const backend = await subtask({ title: 'Open refund API', deliveryArea: 'backend' });
    const stale = {
      expectedUpdatedAt: new Date(backend.updatedAt.getTime() - 60_000).toISOString(),
    };
    assert.equal((await post('devBackend', backend.id, 'claim', stale)).status, 409);
    await backend.reload();
    assert.equal(backend.assigneeId, null);

    const done = await subtask({ title: 'Done backend', deliveryArea: 'backend', status: 'done' });
    assert.equal((await post('devBackend', done.id, 'claim', version(done))).status, 409);
    const assigned = await subtask({
      title: 'Assigned backend',
      deliveryArea: 'backend',
      mode: 'assigned',
      assigneeId: users.devBackend.id,
    });
    assert.equal((await post('devFullstack', assigned.id, 'claim', version(assigned))).status, 409);
    for (const row of [backend, done, assigned]) {
      assert.equal((await activities(row.id, 'task.claimed')).length, 0);
    }
  });

  test('the available queue lists only matching open work and carries no handoff messages', async () => {
    const backend = await subtask({ title: 'Queue backend open', deliveryArea: 'backend' });
    const mobile = await subtask({ title: 'Queue mobile open', deliveryArea: 'mobile' });
    const qaWork = await subtask({ title: 'Queue QA open', deliveryArea: 'qa' });
    await subtask({ title: 'Queue canceled', deliveryArea: 'backend', status: 'canceled' });
    await TaskCommentModel.create({
      workspaceId: workspace.id,
      taskId: backend.id,
      authorId: users.po.id,
      body: 'Private planning note before claim',
      handoffKind: 'question',
    });

    const ids = (queue: Awaited<ReturnType<typeof queueFor>>) => {
      const available = queue.buckets.find((bucket) => bucket.code === 'available_to_claim');
      return { available, ids: new Set(available?.items.map((item) => item.subjectId) ?? []) };
    };

    const backendQueue = ids(await queueFor('devBackend'));
    assert.ok(backendQueue.available);
    assert.ok(backendQueue.ids.has(backend.id));
    assert.ok(!backendQueue.ids.has(mobile.id));
    assert.ok(!backendQueue.ids.has(qaWork.id));
    const backendItem = backendQueue.available!.items.find(
      (item) => item.subjectId === backend.id,
    )!;
    assert.equal(backendItem.nextAction.code, 'claim_subtask');
    assert.equal(backendItem.lastMessage, undefined);
    assert.equal(backendItem.sourceUpdatedAt, backend.updatedAt.toISOString());

    const fullstackQueue = ids(await queueFor('devFullstack'));
    assert.ok(fullstackQueue.ids.has(backend.id) && fullstackQueue.ids.has(mobile.id));
    assert.ok(!fullstackQueue.ids.has(qaWork.id));

    const qaQueue = ids(await queueFor('qa'));
    assert.ok(qaQueue.ids.has(qaWork.id) && !qaQueue.ids.has(backend.id));

    const unclassifiedQueue = ids(await queueFor('devUnclassified'));
    assert.equal(unclassifiedQueue.available?.total, 0);

    const plannerQueue = await queueFor('po');
    assert.ok(!plannerQueue.buckets.some((bucket) => bucket.code === 'available_to_claim'));

    // A claimed task leaves the available bucket at once.
    assert.equal((await post('devBackend', backend.id, 'claim', backendItem)).status, 400);
    const claim = await post('devBackend', backend.id, 'claim', {
      expectedUpdatedAt: backendItem.sourceUpdatedAt,
    });
    assert.equal(claim.status, 200);
    assert.ok(!ids(await queueFor('devFullstack')).ids.has(backend.id));
  });

  test('planners release and reassign with status kept, audit, and 403/409 guards', async () => {
    const backend = await subtask({
      title: 'Assigned backend in review',
      deliveryArea: 'backend',
      mode: 'assigned',
      assigneeId: users.devBackend.id,
      status: 'in_review',
    });
    assert.equal((await post('devBackend', backend.id, 'release', version(backend))).status, 403);
    assert.equal((await post('qa', backend.id, 'release', version(backend))).status, 403);

    const released = await post('po', backend.id, 'release', version(backend));
    assert.equal(released.status, 200);
    await backend.reload();
    assert.equal(backend.assigneeId, null);
    assert.equal(backend.assignmentMode, 'open');
    assert.equal(backend.status, 'in_review');
    const releaseAudit = await activities(backend.id, 'task.released');
    assert.equal(releaseAudit.length, 1);
    assert.equal(releaseAudit[0].metadataJson?.fromAssigneeId, users.devBackend.id);
    assert.equal(releaseAudit[0].metadataJson?.toAssigneeId, null);
    assert.equal((await post('po', backend.id, 'release', version(backend))).status, 409);

    // Reassign: mismatch, non-member and Developer actor are rejected; Fullstack fits backend.
    assert.equal(
      (await post('po', backend.id, 'reassign', { ...version(backend), assigneeId: users.qa.id }))
        .status,
      400,
    );
    assert.equal(
      (
        await post('po', backend.id, 'reassign', {
          ...version(backend),
          assigneeId: users.outsider.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post('devBackend', backend.id, 'reassign', {
          ...version(backend),
          assigneeId: users.devBackend.id,
        })
      ).status,
      403,
    );
    const reassigned = await post('owner', backend.id, 'reassign', {
      ...version(backend),
      assigneeId: users.devFullstack.id,
    });
    assert.equal(reassigned.status, 200);
    await backend.reload();
    assert.equal(backend.assigneeId, users.devFullstack.id);
    assert.equal(backend.assignmentMode, 'assigned');
    assert.equal(backend.status, 'in_review');
    const reassignAudit = await activities(backend.id, 'task.reassigned');
    assert.equal(reassignAudit.length, 1);
    assert.equal(reassignAudit[0].metadataJson?.fromAssigneeId, null);
    assert.equal(reassignAudit[0].metadataJson?.toAssigneeId, users.devFullstack.id);
    const stale = await post('po', backend.id, 'reassign', {
      expectedUpdatedAt: new Date(backend.updatedAt.getTime() - 1000).toISOString(),
      assigneeId: users.devBackend.id,
    });
    assert.equal(stale.status, 409);
    await backend.reload();
    assert.equal(backend.assigneeId, users.devFullstack.id);
  });

  test('Fullstack matches manual assignment, PATCH on open work assigns, and specialty edits stay consistent', async () => {
    const frontend = await subtask({ title: 'Open Fullstack form', deliveryArea: 'frontend' });
    const patched = await fetch(`${base}/workspaces/${workspace.id}/tasks/${frontend.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.get(users.po.id)! },
      body: JSON.stringify({ assigneeId: users.devFullstack.id }),
    });
    assert.equal(patched.status, 200);
    await frontend.reload();
    assert.equal(frontend.assigneeId, users.devFullstack.id);
    assert.equal(frontend.assignmentMode, 'assigned');

    const backendOnly = await fetch(`${base}/workspaces/${workspace.id}/tasks/${frontend.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.get(users.po.id)! },
      body: JSON.stringify({ assigneeId: users.devBackend.id }),
    });
    assert.equal(backendOnly.status, 400);

    // Removing Fullstack would orphan the active frontend work, so the edit is refused.
    const edit = await fetch(
      `${base}/workspaces/${workspace.id}/members/${users.devFullstack.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookies.get(users.owner.id)! },
        body: JSON.stringify({ role: 'dev', specialties: ['backend'] }),
      },
    );
    assert.equal(edit.status, 409);
    const keep = await fetch(
      `${base}/workspaces/${workspace.id}/members/${users.devFullstack.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookies.get(users.owner.id)! },
        body: JSON.stringify({ role: 'dev', specialties: ['fullstack'] }),
      },
    );
    assert.equal(keep.status, 200);
  });
});
