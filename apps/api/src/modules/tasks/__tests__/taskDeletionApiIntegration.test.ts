import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';

import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugModel,
  QaDocumentModel,
  QaSignOffModel,
  ReleaseDecisionModel,
  RequirementModel,
  TaskAttachmentModel,
  TaskActivityModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
  TestCaseModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import type { ReadinessSnapshot } from '@qlick/contracts';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Task deletion HTTP API integration (AGY-2.4)', () => {
  let appServer: Server;
  let baseUrl: string;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let owner: UserModel;
  let admin: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;
  const cookies = new Map<string, string>();

  async function createAuthCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'TaskDeletionIntegrationTest',
      '127.0.0.1',
    );
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
    return `${accessTokenCookieName}=${token}`;
  }

  async function createTask(
    workspaceId: string,
    reporterId: string,
    title: string,
    parentTaskId: string | null = null,
  ): Promise<TaskModel> {
    return await TaskModel.create({
      workspaceId,
      reporterId,
      parentTaskId,
      deliveryArea: parentTaskId ? 'frontend' : null,
      title,
      status: 'todo',
      priority: 'medium',
    });
  }

  async function deleteRequest(
    workspaceId: string,
    taskId: string,
    cookie?: string,
  ): Promise<Response> {
    return await fetch(`${baseUrl}/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: cookie ? { Cookie: cookie } : undefined,
    });
  }

  before(async () => {
    await sequelize.authenticate();

    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const address = appServer.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const timestamp = Date.now();
    [owner, admin, po, dev, qa, outsider] = await Promise.all([
      UserModel.create({
        email: `task-delete-owner-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Delete Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `task-delete-admin-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Delete Admin',
        role: 'admin',
      }),
      UserModel.create({
        email: `task-delete-po-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Delete PO',
        role: 'po',
      }),
      UserModel.create({
        email: `task-delete-dev-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Delete Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `task-delete-qa-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Delete QA',
        role: 'qa',
      }),
      UserModel.create({
        email: `task-delete-outsider-${timestamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Delete Outsider',
        role: 'admin',
      }),
    ]);

    workspaceA = await WorkspaceModel.create({
      name: 'Task Deletion Workspace A',
      slug: `task-deletion-a-${timestamp}`,
      ownerId: owner.id,
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Task Deletion Workspace B',
      slug: `task-deletion-b-${timestamp}`,
      ownerId: outsider.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspaceA.id, userId: admin.id, role: 'admin' },
      { workspaceId: workspaceA.id, userId: po.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspaceA.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspaceB.id, userId: outsider.id, role: 'owner' },
    ]);

    for (const user of [owner, admin, po, dev, qa, outsider]) {
      cookies.set(user.id, await createAuthCookie(user));
    }
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }

    await ReleaseDecisionModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await QaSignOffModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await BugModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TestResultModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TestRunModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TestCaseModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TaskAttachmentModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TaskDocumentModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await QaDocumentModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TaskRequirementModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await RequirementModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TaskActivityModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
    });
    await TaskModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
      force: true,
    });
    await WorkspaceModel.destroy({ where: { id: [workspaceA.id, workspaceB.id] } });
    await UserModel.destroy({
      where: { id: [owner.id, admin.id, po.id, dev.id, qa.id, outsider.id] },
      force: true,
    });
  });

  test('Owner, Admin, and PO can delete tasks through the authenticated API', async () => {
    for (const actor of [owner, admin, po]) {
      const task = await createTask(workspaceA.id, actor.id, `${actor.role} deletion target`);

      const response = await deleteRequest(workspaceA.id, task.id, cookies.get(actor.id));
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), { data: { success: true } });

      assert.strictEqual(await TaskModel.findByPk(task.id), null);
      const deletedTask = await TaskModel.findByPk(task.id, { paranoid: false });
      assert.ok(deletedTask?.deletedAt);

      const activity = await TaskActivityModel.findOne({
        where: { workspaceId: workspaceA.id, taskId: task.id, action: 'deleted' },
      });
      assert.strictEqual(activity?.actorId, actor.id);
      assert.deepStrictEqual(activity?.metadataJson, {
        recordType: 'task',
        title: task.title,
        parentTaskId: null,
        deliveryArea: null,
      });
    }
  });

  test('deleting a parent atomically soft-deletes its direct subtasks and records activity', async () => {
    const parent = await createTask(workspaceA.id, owner.id, 'Parent deletion target');
    const subtask = await createTask(
      workspaceA.id,
      owner.id,
      'Direct subtask deletion target',
      parent.id,
    );

    const response = await deleteRequest(workspaceA.id, parent.id, cookies.get(owner.id));
    assert.strictEqual(response.status, 200);

    assert.strictEqual(await TaskModel.findByPk(parent.id), null);
    assert.strictEqual(await TaskModel.findByPk(subtask.id), null);

    const persistedRows = await TaskModel.findAll({
      where: { id: [parent.id, subtask.id] },
      paranoid: false,
    });
    assert.strictEqual(persistedRows.length, 2);
    assert.ok(persistedRows.every((task) => task.deletedAt));

    const activities = await TaskActivityModel.findAll({
      where: {
        workspaceId: workspaceA.id,
        taskId: [parent.id, subtask.id],
        action: 'deleted',
      },
    });
    assert.strictEqual(activities.length, 2);
    assert.ok(activities.every((activity) => activity.actorId === owner.id));
    assert.ok(
      activities.some(
        (activity) =>
          activity.taskId === subtask.id &&
          activity.metadataJson?.recordType === 'subtask' &&
          activity.metadataJson?.title === subtask.title,
      ),
    );
  });

  test('deletes one direct Subtask only for Owner, Admin, and PO', async () => {
    const parent = await createTask(workspaceA.id, owner.id, 'Direct Subtask parent');

    for (const actor of [owner, admin, po]) {
      const sibling = await createTask(
        workspaceA.id,
        owner.id,
        `${actor.role} direct Subtask target`,
        parent.id,
      );
      const response = await deleteRequest(workspaceA.id, sibling.id, cookies.get(actor.id));
      assert.strictEqual(response.status, 200);
      assert.strictEqual(await TaskModel.findByPk(sibling.id), null);
      assert.ok(await TaskModel.findByPk(parent.id));
    }

    for (const actor of [dev, qa]) {
      const forbiddenSubtask = await createTask(
        workspaceA.id,
        owner.id,
        `${actor.role} forbidden direct Subtask target`,
        parent.id,
      );
      const response = await deleteRequest(
        workspaceA.id,
        forbiddenSubtask.id,
        cookies.get(actor.id),
      );
      assert.strictEqual(response.status, 403);
      assert.ok(await TaskModel.findByPk(forbiddenSubtask.id));
    }
  });

  test('blocks deletion when the Task tree retains release-critical links or immutable history', async () => {
    const feature = await createTask(workspaceA.id, po.id, 'Release-critical deletion target');
    const requirement = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-DELETE-${Date.now()}`,
      title: 'Deletion safety requirement',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspaceA.id,
      taskId: feature.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });

    const document = await QaDocumentModel.create({
      workspaceId: workspaceA.id,
      title: 'Deletion safety test plan',
      docType: 'test_plan',
      createdBy: qa.id,
    });
    await TaskDocumentModel.create({
      workspaceId: workspaceA.id,
      taskId: feature.id,
      documentId: document.id,
      linkedBy: qa.id,
    });
    await TaskAttachmentModel.create({
      workspaceId: workspaceA.id,
      taskId: feature.id,
      fileName: 'release-evidence.txt',
      fileSize: 24,
      mimeType: 'text/plain',
      storageRef: `task-deletion/${feature.id}/release-evidence.txt`,
      category: 'qa_evidence',
      uploaderId: qa.id,
    });

    const testCase = await TestCaseModel.create({
      workspaceId: workspaceA.id,
      title: 'Deletion safety execution',
      createdBy: po.id,
    });
    const testRun = await TestRunModel.create({
      workspaceId: workspaceA.id,
      testCaseId: testCase.id,
      build: 'task-delete-safety',
      environment: 'test',
      status: 'completed',
      executorId: qa.id,
      completedAt: new Date(),
    });
    const testResult = await TestResultModel.create({
      workspaceId: workspaceA.id,
      testRunId: testRun.id,
      status: 'failed',
      executorId: qa.id,
    });
    await BugModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: feature.id,
      requirementId: requirement.id,
      testResultId: testResult.id,
      assigneeId: dev.id,
      title: 'Deletion safety Bug',
      severity: 'high',
      reproductionDetails: 'Exercise the release-critical Task deletion guard.',
      createdBy: qa.id,
    });

    const now = new Date().toISOString();
    const snapshot: ReadinessSnapshot = {
      schemaVersion: 1,
      capturedAt: now,
      featureTask: {
        id: feature.id,
        title: feature.title,
        status: feature.status,
        updatedAt: feature.updatedAt.toISOString(),
      },
      subtasks: { total: 0, completed: 0 },
      requirements: { total: 1 },
      testExecution: {
        totalTestCases: 1,
        passed: 0,
        failed: 1,
        blocked: 0,
        skipped: 0,
        unexecuted: 0,
      },
      bugs: {
        total: 1,
        open: 1,
        inProgress: 0,
        resolved: 0,
        verified: 0,
        reopened: 0,
        criticalOrHighUnverified: 1,
      },
      qaSignOff: null,
    };
    const signOff = await QaSignOffModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: feature.id,
      decision: 'rejected',
      readinessSnapshot: snapshot,
      signedBy: qa.id,
    });
    await ReleaseDecisionModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: feature.id,
      qaSignOffId: signOff.id,
      decision: 'rejected',
      readinessSnapshot: snapshot,
      decidedBy: po.id,
    });

    const response = await deleteRequest(workspaceA.id, feature.id, cookies.get(owner.id));
    assert.strictEqual(response.status, 409);
    const body = (await response.json()) as { code: string; detail: string };
    assert.strictEqual(body.code, 'CONFLICT');
    assert.match(body.detail, /1 Requirement link\(s\)/);
    assert.match(body.detail, /1 document link\(s\)/);
    assert.match(body.detail, /1 attachment\(s\)/);
    assert.match(body.detail, /1 Bug\(s\)/);
    assert.match(body.detail, /1 QA Sign-off\(s\)/);
    assert.match(body.detail, /1 Release Decision\(s\)/);
    assert.ok(await TaskModel.findByPk(feature.id));

    await assert.rejects(feature.destroy(), /release-critical records and cannot be soft-deleted/);
  });

  test('PostgreSQL rejects new release-critical links to a soft-deleted Task', async () => {
    const task = await createTask(workspaceA.id, owner.id, 'Inactive link target');
    const response = await deleteRequest(workspaceA.id, task.id, cookies.get(owner.id));
    assert.strictEqual(response.status, 200);

    const requirement = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-INACTIVE-${Date.now()}`,
      title: 'Inactive Task link guard',
      createdBy: po.id,
    });
    await assert.rejects(
      TaskRequirementModel.create({
        workspaceId: workspaceA.id,
        taskId: task.id,
        requirementId: requirement.id,
        linkedBy: po.id,
      }),
      /release-critical records must reference an active Task/i,
    );
  });

  test('Dev, QA, non-members, unauthenticated users, and cross-Workspace IDs cannot delete', async () => {
    const devTarget = await createTask(workspaceA.id, owner.id, 'Dev forbidden target');
    const qaTarget = await createTask(workspaceA.id, owner.id, 'QA forbidden target');
    const outsiderTarget = await createTask(workspaceA.id, owner.id, 'Outsider forbidden target');
    const unauthenticatedTarget = await createTask(
      workspaceA.id,
      owner.id,
      'Unauthenticated forbidden target',
    );
    const taskInWorkspaceB = await createTask(workspaceB.id, outsider.id, 'Cross-Workspace target');

    assert.strictEqual(
      (await deleteRequest(workspaceA.id, devTarget.id, cookies.get(dev.id))).status,
      403,
    );
    assert.strictEqual(
      (await deleteRequest(workspaceA.id, qaTarget.id, cookies.get(qa.id))).status,
      403,
    );
    assert.strictEqual(
      (await deleteRequest(workspaceA.id, outsiderTarget.id, cookies.get(outsider.id))).status,
      403,
    );
    assert.strictEqual((await deleteRequest(workspaceA.id, unauthenticatedTarget.id)).status, 401);
    assert.strictEqual(
      (await deleteRequest(workspaceA.id, taskInWorkspaceB.id, cookies.get(po.id))).status,
      404,
    );

    for (const task of [
      devTarget,
      qaTarget,
      outsiderTarget,
      unauthenticatedTarget,
      taskInWorkspaceB,
    ]) {
      assert.ok(await TaskModel.findByPk(task.id));
    }
  });
});
