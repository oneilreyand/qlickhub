import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AuthSecurityEventModel,
  FeatureReadinessReviewModel,
  RequirementFindingClarificationModel,
  RequirementFindingModel,
  RequirementFindingStatusEventModel,
  RequirementFindingTriageDecisionModel,
  RequirementFindingTriagePositionModel,
  RequirementModel,
  TaskAttachmentModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { storageService } from '../../../services/storageService.js';

describe('Permanent Workspace deletion HTTP/PostgreSQL integration', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let admin: UserModel;
  let workspace: WorkspaceModel;
  let ownerCookie: string;
  let adminCookie: string;
  let storedRef: string;
  let findingId: string;

  const request = (path: string, cookie: string, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    [owner, admin] = await Promise.all(
      ['owner', 'admin'].map((role) =>
        UserModel.create({
          email: `workspace-delete-${role}-${stamp}@example.com`,
          name: `Delete ${role}`,
          role: role as 'owner' | 'admin',
          passwordHash: bcrypt.hashSync('Test-password-123!', 10),
        }),
      ),
    );
    workspace = await WorkspaceModel.create({
      name: `Permanent Delete ${stamp}`,
      slug: `permanent-delete-${stamp}`,
      ownerId: owner.id,
      archivedAt: new Date(),
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
    ]);
    const [ownerSession, adminSession] = await Promise.all([
      sessionManager.createSession(owner.id, 'TestRunner', '127.0.0.1'),
      sessionManager.createSession(admin.id, 'TestRunner', '127.0.0.1'),
    ]);
    ownerCookie = `${accessTokenCookieName}=${signToken({ userId: owner.id, email: owner.email, role: owner.role, sessionId: ownerSession })}`;
    adminCookie = `${accessTokenCookieName}=${signToken({ userId: admin.id, email: admin.email, role: admin.role, sessionId: adminSession })}`;

    const folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Delete me',
      createdBy: owner.id,
    });
    const task = await TaskModel.create({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: 'Delete me too',
      reporterId: owner.id,
      status: 'todo',
      priority: 'medium',
    });
    const requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-DELETE-${stamp}`,
      title: 'Requirement with triage history',
      description: 'Persists P1B evidence until its Workspace is permanently deleted.',
      status: 'active',
      createdBy: owner.id,
    });
    await FeatureReadinessReviewModel.create({
      workspaceId: workspace.id,
      featureTaskId: task.id,
      reviewerRole: 'dev',
      recommendation: 'changes_requested',
      notes: 'Deletion fixture readiness review.',
      concernSeverity: 'medium',
      createdBy: admin.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: task.id,
      requirementId: requirement.id,
      linkedBy: owner.id,
    });
    const finding = await RequirementFindingModel.create({
      workspaceId: workspace.id,
      featureTaskId: task.id,
      requirementId: requirement.id,
      requirementCode: requirement.code,
      requirementTitle: requirement.title,
      requirementStatus: requirement.status,
      category: 'missing_flow',
      severity: 'critical',
      summary: 'Deletion fixture finding',
      details: 'Ensures permanent Workspace deletion includes all P1B evidence.',
      proposedCause: 'shared',
      reporterGroup: 'product',
      reportedBy: owner.id,
    });
    findingId = finding.id;
    await RequirementFindingClarificationModel.create({
      workspaceId: workspace.id,
      findingId,
      message: 'Deletion fixture clarification.',
      authorGroup: 'product',
      createdBy: owner.id,
    });
    const positions = await RequirementFindingTriagePositionModel.bulkCreate([
      {
        workspaceId: workspace.id,
        findingId,
        participantGroup: 'product',
        classification: 'shared',
        rationale: 'Product fixture position.',
        createdBy: owner.id,
      },
      {
        workspaceId: workspace.id,
        findingId,
        participantGroup: 'development',
        classification: 'shared',
        rationale: 'Development fixture position.',
        createdBy: admin.id,
      },
      {
        workspaceId: workspace.id,
        findingId,
        participantGroup: 'qa',
        classification: 'shared',
        rationale: 'QA fixture position.',
        createdBy: admin.id,
      },
    ]);
    await RequirementFindingTriageDecisionModel.create({
      workspaceId: workspace.id,
      findingId,
      version: 1,
      classification: 'shared',
      mode: 'consensus',
      rationale: 'Deletion fixture decision.',
      positionIds: {
        product: positions[0].id,
        development: positions[1].id,
        qa: positions[2].id,
      },
      supersedesDecisionId: null,
      recordedBy: owner.id,
    });
    await RequirementFindingStatusEventModel.create({
      workspaceId: workspace.id,
      findingId,
      action: 'resolved',
      reason: 'Deletion fixture status.',
      createdBy: owner.id,
    });
    const stored = await storageService.saveFile({
      buffer: Buffer.from('permanent deletion evidence'),
      fileName: 'evidence.txt',
      mimeType: 'text/plain',
      workspaceId: workspace.id,
      taskId: task.id,
    });
    storedRef = stored.storageRef;
    await TaskAttachmentModel.create({
      workspaceId: workspace.id,
      taskId: task.id,
      fileName: 'evidence.txt',
      fileSize: stored.fileSize,
      mimeType: 'text/plain',
      storageRef: stored.storageRef,
      storageProvider: stored.provider,
      providerFileId: stored.providerFileId,
      category: 'general',
      uploaderId: owner.id,
    });
    await AuthSecurityEventModel.create({
      eventType: 'member_password_reset',
      workspaceId: workspace.id,
      actorId: owner.id,
      subjectUserId: admin.id,
      metadata: {
        revokedSessionCount: 0,
        actorWorkspaceRole: 'owner',
        targetWorkspaceRole: 'admin',
      },
    });

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await AuthSecurityEventModel.destroy({ where: { workspaceId: workspace.id } });
      await FeatureReadinessReviewModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingStatusEventModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingTriageDecisionModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingTriagePositionModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingClarificationModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskAttachmentModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceMembershipActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    }
    await UserModel.destroy({ where: { id: [owner.id, admin.id] }, force: true });
    void storedRef;
  });

  test('enforces Owner, archived state, and exact-name confirmation', async () => {
    assert.strictEqual(
      (
        await request(`/workspaces/${workspace.id}`, adminCookie, {
          method: 'DELETE',
          body: JSON.stringify({ confirmationName: workspace.name }),
        })
      ).status,
      403,
    );
    assert.strictEqual(
      (
        await request(`/workspaces/${workspace.id}`, ownerCookie, {
          method: 'DELETE',
          body: JSON.stringify({ confirmationName: 'wrong name' }),
        })
      ).status,
      400,
    );
    const stillPresent = await WorkspaceModel.findByPk(workspace.id);
    assert.ok(stillPresent);
  });

  test('permanently deletes Workspace records and storage while retaining users', async () => {
    const response = await request(`/workspaces/${workspace.id}`, ownerCookie, {
      method: 'DELETE',
      body: JSON.stringify({ confirmationName: workspace.name }),
    });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), {
      data: { workspaceId: workspace.id, deleted: true },
    });
    assert.strictEqual(await WorkspaceModel.findByPk(workspace.id), null);
    assert.strictEqual(
      await WorkFolderModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.strictEqual(
      await TaskModel.findOne({ where: { workspaceId: workspace.id }, paranoid: false }),
      null,
    );
    assert.strictEqual(
      await TaskAttachmentModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.strictEqual(
      await AuthSecurityEventModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.strictEqual(await RequirementFindingModel.findByPk(findingId), null);
    assert.strictEqual(
      await FeatureReadinessReviewModel.findOne({ where: { workspaceId: workspace.id } }),
      null,
    );
    assert.ok(await UserModel.findByPk(owner.id));
    await assert.rejects(
      storageService.openFile({ provider: 'local', storageRef: storedRef, providerFileId: null }),
    );
  });
});
