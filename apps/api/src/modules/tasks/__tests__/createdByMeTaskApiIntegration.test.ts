import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { CreateTaskSchema, TaskListResponseSchema, type Task } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskCreationPermissionModel,
  TaskModel,
  UserModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { workspaceService } from '../../workspaces/workspaceService.js';
import { taskService } from '../taskService.js';

describe('Created-by-me Task HTTP/PostgreSQL integration', () => {
  let server: Server;
  let baseUrl: string;
  let ownerA: UserModel;
  let ownerB: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let folderA: WorkFolderModel;
  let folderB: WorkFolderModel;
  let devFeature: Task;
  let devSecondFeature: Task;
  let qaFeature: Task;
  let ownerFeature: Task;
  let assignedSubtask: Task;
  let foreignFeature: Task;
  let devCookie: string;
  let qaCookie: string;
  let ownerCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'CreatedByMeTaskIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  async function fetchTasks(
    workspaceId: string,
    cookie: string,
    query: Record<string, string> = {},
  ) {
    const params = new URLSearchParams(query);
    return fetch(`${baseUrl}/workspaces/${workspaceId}/tasks?${params.toString()}`, {
      headers: { Cookie: cookie },
    });
  }

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

    const stamp = Date.now();
    [ownerA, ownerB, dev, qa] = await Promise.all([
      UserModel.create({
        email: `created_owner_a_${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Created Task Owner A',
        role: 'owner',
      }),
      UserModel.create({
        email: `created_owner_b_${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Created Task Owner B',
        role: 'owner',
      }),
      UserModel.create({
        email: `created_dev_${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Delegated Developer',
        role: 'dev',
      }),
      UserModel.create({
        email: `created_qa_${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Delegated QA',
        role: 'qa',
      }),
    ]);

    [workspaceA, workspaceB] = await Promise.all([
      WorkspaceModel.create({
        name: 'Created Task Workspace A',
        slug: `created-task-a-${stamp}`,
        ownerId: ownerA.id,
      }),
      WorkspaceModel.create({
        name: 'Created Task Workspace B',
        slug: `created-task-b-${stamp}`,
        ownerId: ownerB.id,
      }),
    ]);

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: ownerA.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceB.id, userId: ownerB.id, role: 'owner' },
      { workspaceId: workspaceB.id, userId: dev.id, role: 'dev' },
    ]);

    [folderA, folderB] = await Promise.all([
      WorkFolderModel.create({
        workspaceId: workspaceA.id,
        name: 'Created Task Folder A',
        position: 0,
        createdBy: ownerA.id,
      }),
      WorkFolderModel.create({
        workspaceId: workspaceB.id,
        name: 'Created Task Folder B',
        position: 0,
        createdBy: ownerB.id,
      }),
    ]);

    await Promise.all([
      workspaceService.grantTaskCreationPermission(workspaceA.id, ownerA.id, {
        userId: dev.id,
      }),
      workspaceService.grantTaskCreationPermission(workspaceA.id, ownerA.id, {
        userId: qa.id,
      }),
      workspaceService.grantTaskCreationPermission(workspaceB.id, ownerB.id, {
        userId: dev.id,
      }),
    ]);

    devFeature = await taskService.createTask(
      dev.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceA.id,
        folderId: folderA.id,
        title: 'Delegated checkout Feature',
        status: 'in_progress',
        priority: 'high',
        startDate: '2026-09-01',
        dueDate: '2026-09-30',
      }),
    );
    devSecondFeature = await taskService.createTask(
      dev.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceA.id,
        folderId: folderA.id,
        title: 'Delegated backlog Feature',
        status: 'todo',
        priority: 'low',
      }),
    );
    qaFeature = await taskService.createTask(
      qa.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceA.id,
        folderId: folderA.id,
        title: 'Delegated QA Feature',
        priority: 'medium',
      }),
    );
    ownerFeature = await taskService.createTask(
      ownerA.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceA.id,
        folderId: folderA.id,
        title: 'Owner-authored Feature',
        priority: 'urgent',
      }),
    );
    foreignFeature = await taskService.createTask(
      dev.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceB.id,
        folderId: folderB.id,
        title: 'Foreign delegated Feature',
      }),
    );

    assignedSubtask = await taskService.createTask(
      ownerA.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceA.id,
        parentTaskId: devFeature.id,
        folderId: folderA.id,
        deliveryArea: 'frontend',
        assigneeId: dev.id,
        title: 'Assigned implementation Subtask',
        status: 'done',
      }),
    );
    await taskService.createTask(
      ownerA.id,
      CreateTaskSchema.parse({
        workspaceId: workspaceA.id,
        parentTaskId: devFeature.id,
        folderId: folderA.id,
        deliveryArea: 'qa',
        assigneeId: qa.id,
        title: 'Assigned QA Subtask',
        status: 'todo',
      }),
    );

    const deletedFeature = await TaskModel.create({
      workspaceId: workspaceA.id,
      folderId: folderA.id,
      title: 'Soft-deleted delegated Feature',
      reporterId: dev.id,
      status: 'todo',
      priority: 'medium',
    });
    await deletedFeature.destroy();

    await Promise.all([
      workspaceService.revokeTaskCreationPermission(workspaceA.id, dev.id),
      workspaceService.revokeTaskCreationPermission(workspaceA.id, qa.id),
    ]);

    [devCookie, qaCookie, ownerCookie, outsiderCookie] = await Promise.all([
      authCookie(dev),
      authCookie(qa),
      authCookie(ownerA),
      authCookie(ownerB),
    ]);
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await TaskCreationPermissionModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
    });
    await TaskModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
      force: true,
    });
    await WorkFolderModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
      force: true,
    });
    await WorkspaceModel.destroy({
      where: { id: [workspaceA.id, workspaceB.id] },
      force: true,
    });
    await UserModel.destroy({
      where: { id: [ownerA.id, ownerB.id, dev.id, qa.id] },
      force: true,
    });
  });

  test('returns only root Task records reported by the authenticated member', async () => {
    const response = await fetchTasks(workspaceA.id, devCookie, {
      myTasksOnly: 'true',
      rootOnly: 'true',
      includeSubtaskSummary: 'true',
      limit: '100',
    });
    assert.strictEqual(response.status, 200);
    const result = TaskListResponseSchema.parse(
      ((await response.json()) as { data: unknown }).data,
    );
    const ids = result.tasks.map((task) => task.id);

    assert.deepStrictEqual(new Set(ids), new Set([devFeature.id, devSecondFeature.id]));
    assert.ok(!ids.includes(qaFeature.id));
    assert.ok(!ids.includes(ownerFeature.id));
    assert.ok(!ids.includes(assignedSubtask.id));
    assert.ok(!ids.includes(foreignFeature.id));
    assert.ok(result.tasks.every((task) => task.parentTaskId === null));
    assert.ok(result.tasks.every((task) => task.reporterId === dev.id));
    assert.deepStrictEqual(result.tasks.find((task) => task.id === devFeature.id)?.subtaskSummary, {
      total: 2,
      completed: 1,
      areas: {
        frontend: { total: 1, completed: 1 },
        backend: { total: 0, completed: 0 },
        mobile: { total: 0, completed: 0 },
        fullstack: { total: 0, completed: 0 },
        qa: { total: 1, completed: 0 },
      },
    });
  });

  test('supports server-side search, filters, totals, and pagination inside reporter scope', async () => {
    const filteredResponse = await fetchTasks(workspaceA.id, devCookie, {
      myTasksOnly: 'true',
      rootOnly: 'true',
      search: 'checkout',
      status: 'in_progress',
      priority: 'high',
    });
    assert.strictEqual(filteredResponse.status, 200);
    const filtered = TaskListResponseSchema.parse(
      ((await filteredResponse.json()) as { data: unknown }).data,
    );
    assert.deepStrictEqual(
      filtered.tasks.map((task) => task.id),
      [devFeature.id],
    );
    assert.strictEqual(filtered.total, 1);

    const pageResponse = await fetchTasks(workspaceA.id, devCookie, {
      myTasksOnly: 'true',
      rootOnly: 'true',
      page: '2',
      limit: '1',
    });
    assert.strictEqual(pageResponse.status, 200);
    const page = TaskListResponseSchema.parse(
      ((await pageResponse.json()) as { data: unknown }).data,
    );
    assert.strictEqual(page.total, 2);
    assert.strictEqual(page.page, 2);
    assert.strictEqual(page.tasks.length, 1);
  });

  test('keeps delegated Dev/QA roots visible after revocation and applies the rule to Planners', async () => {
    const query = { myTasksOnly: 'true', rootOnly: 'true', limit: '100' };
    const [qaResponse, ownerResponse] = await Promise.all([
      fetchTasks(workspaceA.id, qaCookie, query),
      fetchTasks(workspaceA.id, ownerCookie, query),
    ]);
    assert.strictEqual(qaResponse.status, 200);
    assert.strictEqual(ownerResponse.status, 200);

    const qaResult = TaskListResponseSchema.parse(
      ((await qaResponse.json()) as { data: unknown }).data,
    );
    const ownerResult = TaskListResponseSchema.parse(
      ((await ownerResponse.json()) as { data: unknown }).data,
    );
    assert.deepStrictEqual(
      qaResult.tasks.map((task) => task.id),
      [qaFeature.id],
    );
    assert.deepStrictEqual(
      ownerResult.tasks.map((task) => task.id),
      [ownerFeature.id],
    );
  });

  test('preserves the assigned-work query and rejects non-members', async () => {
    const assignedResponse = await fetchTasks(workspaceA.id, devCookie, {
      myTasksOnly: 'true',
      limit: '100',
    });
    assert.strictEqual(assignedResponse.status, 200);
    const assigned = TaskListResponseSchema.parse(
      ((await assignedResponse.json()) as { data: unknown }).data,
    );
    assert.ok(assigned.tasks.some((task) => task.id === assignedSubtask.id));
    assert.ok(!assigned.tasks.some((task) => task.id === devFeature.id));

    const forbidden = await fetchTasks(workspaceA.id, outsiderCookie, {
      myTasksOnly: 'true',
      rootOnly: 'true',
    });
    assert.strictEqual(forbidden.status, 403);
  });
});
