import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  RequirementFindingClarificationModel,
  RequirementFindingModel,
  RequirementFindingStatusEventModel,
  RequirementFindingTriageDecisionModel,
  RequirementFindingTriagePositionModel,
  RequirementModel,
  TaskActivityModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Requirement finding and cross-role triage HTTP/PostgreSQL integration (P1B)', () => {
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let feature: TaskModel;
  let requirement: RequirementModel;
  let otherRequirement: RequirementModel;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let outsider: UserModel;
  let ownerCookie: string;
  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let outsiderCookie: string;
  let findingId: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'RequirementFindingIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
  }

  const request = (
    cookie: string,
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ) =>
    fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: options.body ? JSON.stringify(options.body) : undefined,
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

    const stamp = Date.now();
    [owner, po, dev, qa, outsider] = await Promise.all([
      UserModel.create({
        email: `finding-owner-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Finding Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `finding-po-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Finding PO',
        role: 'po',
      }),
      UserModel.create({
        email: `finding-dev-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Finding Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `finding-qa-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Finding QA',
        role: 'qa',
      }),
      UserModel.create({
        email: `finding-outsider-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Finding Outsider',
        role: 'owner',
      }),
    ]);
    workspace = await WorkspaceModel.create({
      name: 'Requirement Finding Workspace',
      slug: `requirement-finding-${stamp}`,
      ownerId: owner.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: 'Other Finding Workspace',
      slug: `other-requirement-finding-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
      { workspaceId: otherWorkspace.id, userId: outsider.id, role: 'owner' },
    ]);
    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Checkout failure flow',
      priority: 'high',
      status: 'todo',
      reporterId: po.id,
    });
    requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-FIND-${stamp}`,
      title: 'Customer receives a payment result',
      description: 'Successful payment is confirmed.',
      status: 'active',
      createdBy: po.id,
    });
    otherRequirement = await RequirementModel.create({
      workspaceId: otherWorkspace.id,
      code: `REQ-OTHER-${stamp}`,
      title: 'Other workspace Requirement',
      status: 'active',
      createdBy: outsider.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: feature.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });

    [ownerCookie, poCookie, devCookie, qaCookie, outsiderCookie] = await Promise.all([
      authCookie(owner),
      authCookie(po),
      authCookie(dev),
      authCookie(qa),
      authCookie(outsider),
    ]);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await RequirementFindingStatusEventModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingTriageDecisionModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingTriagePositionModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingClarificationModel.destroy({ where: { workspaceId: workspace.id } });
      await RequirementFindingModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
    }
    if (otherWorkspace) {
      await RequirementModel.destroy({ where: { workspaceId: otherWorkspace.id } });
    }
    for (const target of [workspace, otherWorkspace]) {
      if (target) await WorkspaceModel.destroy({ where: { id: target.id } });
    }
    for (const user of [owner, po, dev, qa, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('records a critical linked-Requirement finding while rejecting false scope and outsiders', async () => {
    const invalidScope = await request(
      qaCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings`,
      {
        method: 'POST',
        body: {
          requirementId: otherRequirement.id,
          category: 'missing_flow',
          severity: 'critical',
          summary: 'Cross-workspace Requirement',
          details: 'This must never be accepted.',
          proposedCause: 'unknown',
        },
      },
    );
    assert.strictEqual(invalidScope.status, 409);

    const response = await request(
      qaCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings`,
      {
        method: 'POST',
        body: {
          requirementId: requirement.id,
          category: 'missing_flow',
          severity: 'critical',
          summary: 'Alur pembayaran gagal belum dijelaskan',
          details: 'Requirement hanya menjelaskan hasil pembayaran yang berhasil.',
          proposedCause: 'requirement_definition',
        },
      },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as any;
    findingId = body.finding.id;
    assert.strictEqual(body.finding.requirement.code, requirement.code);
    assert.strictEqual(body.finding.reporterGroup, 'qa');
    assert.strictEqual(body.finding.blocksNewWork, true);

    const stateResponse = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings`,
    );
    assert.strictEqual(stateResponse.status, 200);
    const state = (await stateResponse.json()) as any;
    assert.strictEqual(state.findingState.mode, 'observation');
    assert.strictEqual(state.findingState.openCriticalCount, 1);
    assert.strictEqual(state.findingState.findings.length, 1);

    const outsiderResponse = await request(
      outsiderCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings`,
    );
    assert.strictEqual(outsiderResponse.status, 403);
    const stored = await RequirementFindingModel.findByPk(findingId);
    await assert.rejects(() => stored!.update({ summary: 'Rewritten history' }));
    await assert.rejects(() => requirement.destroy());
    await assert.rejects(() => feature.destroy());
  });

  test('keeps clarification separate from QA Test Results and records activity', async () => {
    const response = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/clarifications`,
      {
        method: 'POST',
        body: { message: 'Timeout harus menampilkan pesan dan opsi mencoba kembali.' },
      },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as any;
    assert.strictEqual(body.finding.clarifications.length, 1);
    assert.strictEqual(body.finding.clarifications[0].authorGroup, 'product');
    assert.strictEqual(
      await TaskActivityModel.count({
        where: {
          workspaceId: workspace.id,
          taskId: feature.id,
          action: 'feature.requirement_finding.clarified',
        },
      }),
      1,
    );
  });

  test('creates consensus only after Product, Development, and QA align', async () => {
    const positions = [
      [poCookie, 'Product akan melengkapi aturan kegagalan.'],
      [devCookie, 'Kontrak error perlu menjadi bagian dari Requirement.'],
      [qaCookie, 'Kondisi timeout perlu memiliki hasil yang dapat diuji.'],
    ] as const;
    for (const [cookie, rationale] of positions) {
      const response = await request(
        cookie,
        `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/triage-positions`,
        {
          method: 'POST',
          body: { classification: 'shared', rationale },
        },
      );
      assert.strictEqual(response.status, 201);
    }

    const decisions = await RequirementFindingTriageDecisionModel.findAll({
      where: { workspaceId: workspace.id, findingId },
    });
    assert.strictEqual(decisions.length, 1);
    assert.strictEqual(decisions[0].mode, 'consensus');
    assert.strictEqual(decisions[0].classification, 'shared');
    assert.ok(decisions[0].positionIds.product);
    assert.ok(decisions[0].positionIds.development);
    assert.ok(decisions[0].positionIds.qa);
  });

  test('preserves dissent, limits dispute decisions to Owner/Admin, and versions corrections', async () => {
    const disagreement = await request(
      devCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/triage-positions`,
      {
        method: 'POST',
        body: {
          classification: 'technical_feasibility',
          rationale: 'Timeout juga dipengaruhi batas provider pembayaran.',
        },
      },
    );
    assert.strictEqual(disagreement.status, 201);
    const disagreementBody = (await disagreement.json()) as any;
    assert.strictEqual(disagreementBody.finding.hasTriageDisagreement, true);
    assert.strictEqual(disagreementBody.finding.decisionIsCurrent, false);

    const poDecision = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/governance-decisions`,
      {
        method: 'POST',
        body: { classification: 'shared', rationale: 'PO cannot decide this dispute.' },
      },
    );
    assert.strictEqual(poDecision.status, 403);

    const ownerDecision = await request(
      ownerCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/governance-decisions`,
      {
        method: 'POST',
        body: {
          classification: 'shared',
          rationale: 'Perjelas Requirement dan dokumentasikan batas provider secara bersama.',
        },
      },
    );
    assert.strictEqual(ownerDecision.status, 201);
    const ownerBody = (await ownerDecision.json()) as any;
    assert.strictEqual(ownerBody.finding.currentDecision.version, 2);
    assert.strictEqual(ownerBody.finding.currentDecision.mode, 'governance');
    assert.strictEqual(ownerBody.finding.decisionHistory.length, 2);
    assert.strictEqual(
      ownerBody.finding.latestPositions.development.classification,
      'technical_feasibility',
    );

    for (const [cookie, rationale] of [
      [poCookie, 'Batas provider sudah masuk ke Requirement.'],
      [qaCookie, 'Skenario provider kini dapat diuji.'],
    ] as const) {
      const response = await request(
        cookie,
        `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/triage-positions`,
        {
          method: 'POST',
          body: { classification: 'technical_feasibility', rationale },
        },
      );
      assert.strictEqual(response.status, 201);
    }
    const corrected = await RequirementFindingTriageDecisionModel.findOne({
      where: { workspaceId: workspace.id, findingId },
      order: [['version', 'DESC']],
    });
    assert.strictEqual(corrected?.version, 3);
    assert.strictEqual(corrected?.mode, 'consensus');
    assert.strictEqual(corrected?.classification, 'technical_feasibility');
  });

  test('requires a current triage decision and Planner authority to resolve or reopen', async () => {
    const forbidden = await request(
      devCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/status-events`,
      {
        method: 'POST',
        body: { action: 'resolved', reason: 'Developer cannot close Product planning.' },
      },
    );
    assert.strictEqual(forbidden.status, 403);

    const resolved = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/status-events`,
      {
        method: 'POST',
        body: {
          action: 'resolved',
          reason: 'Requirement dan Kriteria Penerimaan telah diperbarui serta disepakati.',
        },
      },
    );
    assert.strictEqual(resolved.status, 201);
    const resolvedBody = (await resolved.json()) as any;
    assert.strictEqual(resolvedBody.finding.status, 'resolved');
    assert.strictEqual(resolvedBody.finding.blocksNewWork, false);

    const rejectedPosition = await request(
      qaCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/triage-positions`,
      {
        method: 'POST',
        body: { classification: 'shared', rationale: 'Must reopen first.' },
      },
    );
    assert.strictEqual(rejectedPosition.status, 409);

    const reopened = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/findings/${findingId}/status-events`,
      {
        method: 'POST',
        body: { action: 'reopened', reason: 'Aturan retry berubah setelah review lanjutan.' },
      },
    );
    assert.strictEqual(reopened.status, 201);
    const reopenedBody = (await reopened.json()) as any;
    assert.strictEqual(reopenedBody.finding.status, 'open');
    assert.strictEqual(reopenedBody.finding.blocksNewWork, true);

    const event = await RequirementFindingStatusEventModel.findOne({
      where: { workspaceId: workspace.id, findingId, action: 'resolved' },
    });
    await assert.rejects(() => event!.update({ reason: 'Rewritten resolution' }));
  });
});
