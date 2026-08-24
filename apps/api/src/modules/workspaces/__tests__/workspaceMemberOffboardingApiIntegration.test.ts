import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';

import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  BugModel,
  RequirementModel,
  TaskCreationPermissionModel,
  TaskModel,
  TestCaseModel,
  TestResultModel,
  TestRunModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Workspace member offboarding HTTP API integration (MEM-8.3)', () => {
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let adminActor: UserModel;
  let adminTarget: UserModel;
  let po: UserModel;
  let taskDev: UserModel;
  let bugDev: UserModel;
  let removableQa: UserModel;
  let feature: TaskModel;
  const cookies = new Map<string, string>();

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'WorkspaceMemberOffboardingIntegration',
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

  async function removeMember(actor: UserModel, target: UserModel): Promise<Response> {
    return await fetch(`${baseUrl}/workspaces/${workspace.id}/members/${target.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookies.get(actor.id)! },
    });
  }

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

    const stamp = Date.now();
    [owner, adminActor, adminTarget, po, taskDev, bugDev, removableQa] = await Promise.all([
      UserModel.create({
        email: `member-owner-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Member Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `member-admin-actor-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Admin Actor',
        role: 'admin',
      }),
      UserModel.create({
        email: `member-admin-target-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Admin Target',
        role: 'admin',
      }),
      UserModel.create({
        email: `member-po-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Member PO',
        role: 'po',
      }),
      UserModel.create({
        email: `member-task-dev-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Task Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `member-bug-dev-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Bug Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `member-removable-qa-${stamp}@example.com`,
        passwordHash: 'hash',
        name: 'Removable QA',
        role: 'qa',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: 'Member Offboarding Workspace',
      slug: `member-offboarding-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: adminActor.id, role: 'admin' },
      { workspaceId: workspace.id, userId: adminTarget.id, role: 'admin' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: taskDev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: bugDev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: removableQa.id, role: 'qa' },
    ]);

    for (const user of [owner, adminActor, adminTarget, po, taskDev, bugDev, removableQa]) {
      cookies.set(user.id, await authCookie(user));
    }

    feature = await TaskModel.create({
      workspaceId: workspace.id,
      reporterId: po.id,
      title: 'Offboarding history feature',
      status: 'done',
      priority: 'medium',
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await BugModel.destroy({ where: { workspaceId: workspace.id } });
      await TestResultModel.destroy({ where: { workspaceId: workspace.id } });
      await TestRunModel.destroy({ where: { workspaceId: workspace.id } });
      await TestCaseModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceMembershipActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id } });
    }
    await UserModel.destroy({
      where: {
        id: [owner.id, adminActor.id, adminTarget.id, po.id, taskDev.id, bugDev.id, removableQa.id],
      },
      force: true,
    });
  });

  test('PO cannot remove members and Admin cannot remove Owner or another Admin', async () => {
    assert.strictEqual((await removeMember(po, removableQa)).status, 403);
    assert.strictEqual((await removeMember(adminActor, owner)).status, 403);

    const adminResponse = await removeMember(adminActor, adminTarget);
    assert.strictEqual(adminResponse.status, 403);
    const body = (await adminResponse.json()) as { detail: string };
    assert.match(body.detail, /Admins cannot remove another Admin/);
  });

  test('active Task assignment blocks removal until work is complete or reassigned', async () => {
    const activeTask = await TaskModel.create({
      workspaceId: workspace.id,
      reporterId: po.id,
      assigneeId: taskDev.id,
      title: 'Active offboarding blocker',
      status: 'in_progress',
      priority: 'high',
    });

    const response = await removeMember(adminActor, taskDev);
    assert.strictEqual(response.status, 409);
    const body = (await response.json()) as { detail: string };
    assert.match(body.detail, /1 Task assignment/);
    assert.ok(
      await WorkspaceMemberModel.findOne({
        where: { workspaceId: workspace.id, userId: taskDev.id },
      }),
    );

    activeTask.status = 'done';
    await activeTask.save();
  });

  test('active or awaiting-verification Bug assignment blocks removal', async () => {
    const stamp = Date.now();
    const requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-OFFBOARD-${stamp}`,
      title: 'Offboarding Bug requirement',
      createdBy: po.id,
    });
    const testCase = await TestCaseModel.create({
      workspaceId: workspace.id,
      title: 'Offboarding Bug case',
      createdBy: po.id,
    });
    const testRun = await TestRunModel.create({
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      build: 'offboarding-build',
      environment: 'test',
      status: 'completed',
      executorId: removableQa.id,
      completedAt: new Date(),
    });
    const testResult = await TestResultModel.create({
      workspaceId: workspace.id,
      testRunId: testRun.id,
      status: 'failed',
      executorId: removableQa.id,
    });
    const bug = await BugModel.create({
      workspaceId: workspace.id,
      featureTaskId: feature.id,
      requirementId: requirement.id,
      testResultId: testResult.id,
      assigneeId: bugDev.id,
      title: 'Offboarding Bug blocker',
      severity: 'high',
      status: 'resolved',
      reproductionDetails: 'Exercise the persisted offboarding blocker.',
      resolutionNotes: 'Awaiting QA verification.',
      createdBy: removableQa.id,
      resolvedAt: new Date(),
    });

    const response = await removeMember(owner, bugDev);
    assert.strictEqual(response.status, 409);
    const body = (await response.json()) as { detail: string };
    assert.match(body.detail, /1 Bug assignment/);

    bug.status = 'verified';
    bug.verifiedAt = new Date();
    await bug.save();
  });

  test('Admin removal is atomic: membership is soft-deleted, permission revoked, and actor audited', async () => {
    await TaskCreationPermissionModel.create({
      workspaceId: workspace.id,
      userId: removableQa.id,
      grantedBy: owner.id,
    });

    const response = await removeMember(adminActor, removableQa);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { data: { success: true } });

    assert.strictEqual(
      await WorkspaceMemberModel.findOne({
        where: { workspaceId: workspace.id, userId: removableQa.id },
      }),
      null,
    );
    const historicalMembership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace.id, userId: removableQa.id },
      paranoid: false,
    });
    assert.ok(historicalMembership?.deletedAt);
    assert.strictEqual(
      await TaskCreationPermissionModel.count({
        where: { workspaceId: workspace.id, userId: removableQa.id },
      }),
      0,
    );

    const activity = await WorkspaceMembershipActivityModel.findOne({
      where: {
        workspaceId: workspace.id,
        targetUserId: removableQa.id,
        action: 'member_removed',
      },
    });
    assert.strictEqual(activity?.actorId, adminActor.id);
    assert.deepStrictEqual(activity?.metadata, {
      removedRole: 'qa',
      revokedTaskCreationPermissions: 1,
    });
  });

  test('removed member loses access and database rejects new assignments to inactive membership', async () => {
    const accessResponse = await fetch(`${baseUrl}/workspaces/${workspace.id}`, {
      headers: { Cookie: cookies.get(removableQa.id)! },
    });
    assert.strictEqual(accessResponse.status, 403);

    await assert.rejects(
      TaskModel.create({
        workspaceId: workspace.id,
        reporterId: owner.id,
        assigneeId: removableQa.id,
        title: 'Must reject inactive assignee',
        status: 'todo',
        priority: 'medium',
      }),
      /active member of the workspace/,
    );
  });

  test('adding the same user restores the historical membership and records the actor', async () => {
    const response = await fetch(`${baseUrl}/workspaces/${workspace.id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies.get(owner.id)!,
      },
      body: JSON.stringify({ email: removableQa.email, role: 'qa' }),
    });
    assert.strictEqual(response.status, 201);

    const restored = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace.id, userId: removableQa.id },
    });
    assert.ok(restored);
    assert.strictEqual(restored?.role, 'qa');

    const activity = await WorkspaceMembershipActivityModel.findOne({
      where: {
        workspaceId: workspace.id,
        targetUserId: removableQa.id,
        action: 'member_restored',
      },
    });
    assert.strictEqual(activity?.actorId, owner.id);
  });

  test('Owner may remove an Admin while preserving the membership row for history', async () => {
    const response = await removeMember(owner, adminTarget);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(
      await WorkspaceMemberModel.findOne({
        where: { workspaceId: workspace.id, userId: adminTarget.id },
      }),
      null,
    );
    assert.ok(
      await WorkspaceMemberModel.findOne({
        where: { workspaceId: workspace.id, userId: adminTarget.id },
        paranoid: false,
      }),
    );
  });
});
