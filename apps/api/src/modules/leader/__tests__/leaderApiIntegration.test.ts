import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
  BugModel,
  RequirementModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import type {
  LeaderWorkspacesResponse,
  LeaderTimelineResponse,
  LeaderQualityMetricsResponse,
  LeaderReportDigestResponse,
} from '@qlick/contracts';

describe('Leader Executive Dashboard API Integration', () => {
  let server: Server;
  let baseUrl: string;
  let leaderUser: UserModel;
  let devUser: UserModel;
  let outsiderUser: UserModel;

  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;

  let rootTaskA: TaskModel;

  let leaderCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'IntegrationTestAgent/1.0',
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

  before(async () => {
    await sequelize.authenticate();

    leaderUser = await UserModel.create({
      name: 'Leader User',
      email: `leader-${Date.now()}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'owner',
    });

    devUser = await UserModel.create({
      name: 'Dev Member',
      email: `dev-${Date.now()}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'dev',
    });

    outsiderUser = await UserModel.create({
      name: 'Outsider User',
      email: `outsider-${Date.now()}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'dev',
    });

    workspaceA = await WorkspaceModel.create({
      name: `Leader WS Alpha ${Date.now()}`,
      slug: `leader-ws-alpha-${Date.now()}`,
      ownerId: leaderUser.id,
    });

    workspaceB = await WorkspaceModel.create({
      name: `Leader WS Beta ${Date.now()}`,
      slug: `leader-ws-beta-${Date.now()}`,
      ownerId: leaderUser.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspaceA.id,
      userId: leaderUser.id,
      role: 'owner',
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspaceB.id,
      userId: leaderUser.id,
      role: 'admin',
    });

    const devMemberA = await WorkspaceMemberModel.create({
      workspaceId: workspaceA.id,
      userId: devUser.id,
      role: 'dev',
    });

    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: workspaceA.id,
      workspaceMemberId: devMemberA.id,
      specialty: 'backend',
      createdBy: leaderUser.id,
    });

    // Create Tasks
    rootTaskA = await TaskModel.create({
      workspaceId: workspaceA.id,
      title: 'Root Feature Alpha',
      status: 'in_progress',
      priority: 'high',
      reporterId: leaderUser.id,
    });

    await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: rootTaskA.id,
      title: 'Backend API Implementation',
      status: 'in_progress',
      priority: 'medium',
      deliveryArea: 'backend',
      assigneeId: devUser.id,
      reporterId: leaderUser.id,
      startDate: '2026-10-10',
      dueDate: '2026-10-15',
    });

    await TaskModel.create({
      workspaceId: workspaceA.id,
      parentTaskId: rootTaskA.id,
      title: 'Database Optimization',
      status: 'in_progress',
      priority: 'medium',
      deliveryArea: 'backend',
      assigneeId: devUser.id,
      reporterId: leaderUser.id,
      startDate: '2026-10-12',
      dueDate: '2026-10-16',
    });

    const req = await RequirementModel.create({
      workspaceId: workspaceA.id,
      code: `REQ-LEAD-${Date.now()}`,
      title: 'Leader Quality Tracked Requirement',
      status: 'active',
      createdBy: leaderUser.id,
    });

    // Create Staging and Production Bugs
    await BugModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: rootTaskA.id,
      requirementId: req.id,
      testResultId: null,
      environment: 'staging',
      assigneeId: devUser.id,
      title: 'Null pointer in staging',
      severity: 'medium',
      status: 'resolved',
      resolvedAt: new Date(),
      reproductionDetails: 'Steps to reproduce in staging',
      createdBy: leaderUser.id,
    });

    await BugModel.create({
      workspaceId: workspaceA.id,
      featureTaskId: rootTaskA.id,
      requirementId: req.id,
      testResultId: null,
      environment: 'production',
      assigneeId: devUser.id,
      title: 'Production timeout spike',
      severity: 'high',
      status: 'open',
      reproductionDetails: 'Steps to reproduce in prod',
      createdBy: leaderUser.id,
    });

    leaderCookie = await authCookie(leaderUser);
    outsiderCookie = await authCookie(outsiderUser);

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up test data
    await BugModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await TaskModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] } });
    await WorkspaceMemberSpecialtyModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
    });
    await WorkspaceMemberModel.destroy({
      where: { workspaceId: [workspaceA.id, workspaceB.id] },
    });
    await WorkspaceModel.destroy({ where: { id: [workspaceA.id, workspaceB.id] } });
    await UserModel.destroy({ where: { id: [leaderUser.id, devUser.id, outsiderUser.id] } });
  });

  test('GET /v1/leader/workspaces returns workspaces led by user', async () => {
    const res = await fetch(`${baseUrl}/v1/leader/workspaces`, {
      headers: { Cookie: leaderCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as LeaderWorkspacesResponse;
    assert(Array.isArray(data.workspaces));
    assert(data.workspaces.length >= 2);
    const foundA = data.workspaces.find((w) => w.id === workspaceA.id);
    assert(foundA);
    assert.strictEqual(foundA.role, 'owner');
    assert.strictEqual(foundA.activeFeatureCount, 1);
  });

  test('GET /v1/leader/workspaces returns empty list for user without leader role', async () => {
    const res = await fetch(`${baseUrl}/v1/leader/workspaces`, {
      headers: { Cookie: outsiderCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as LeaderWorkspacesResponse;
    assert.strictEqual(data.workspaces.length, 0);
  });

  test('GET /v1/leader/timeline aggregates member subtasks and detects overlap conflict', async () => {
    const res = await fetch(
      `${baseUrl}/v1/leader/timeline?startDate=2026-10-01&endDate=2026-10-31`,
      { headers: { Cookie: leaderCookie } },
    );
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as LeaderTimelineResponse;
    assert.strictEqual(data.totalWorkspaces, 2);
    const devMember = data.members.find((m) => m.id === devUser.id);
    assert(devMember);
    assert.strictEqual(devMember.specialty, 'backend');
    assert.strictEqual(devMember.tasks.length, 2);
    // Overlapping dates (10-15 and 12-16) should trigger conflict
    assert.strictEqual(devMember.conflictCount, 2);
    assert.strictEqual(devMember.capacityStatus, 'overloaded');
  });

  test('GET /v1/leader/quality calculates staging vs prod bugs and defect escape rate', async () => {
    const res = await fetch(`${baseUrl}/v1/leader/quality`, {
      headers: { Cookie: leaderCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as LeaderQualityMetricsResponse;
    assert.strictEqual(data.summary.totalBugs, 2);
    assert.strictEqual(data.summary.stagingBugs, 1);
    assert.strictEqual(data.summary.productionBugs, 1);
    // DER: 1 / 2 * 100 = 50%
    assert.strictEqual(data.summary.defectEscapeRate, 50);
    const devMetric = data.developerMetrics.find((m) => m.developerId === devUser.id);
    assert(devMetric);
    assert.strictEqual(devMetric.assignedBugs, 2);
  });

  test('GET /v1/leader/digest generates executive report markdown summary', async () => {
    const res = await fetch(`${baseUrl}/v1/leader/digest?type=weekly`, {
      headers: { Cookie: leaderCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as LeaderReportDigestResponse;
    assert.strictEqual(data.type, 'weekly');
    assert(data.markdownSummary.includes('Executive Leadership Digest'));
    assert(data.markdownSummary.includes('Defect Escape Rate'));
    assert(data.markdownSummary.includes('Distribusi Beban Kerja'));
  });

  test('Leader endpoints reject unauthenticated access with 401', async () => {
    const res = await fetch(`${baseUrl}/v1/leader/workspaces`);
    assert.strictEqual(res.status, 401);
  });
});
