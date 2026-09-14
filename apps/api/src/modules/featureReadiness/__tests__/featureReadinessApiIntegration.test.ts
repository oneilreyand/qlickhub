import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AcceptanceCriterionModel,
  FeatureReadinessBaselineModel,
  FeatureReadinessBaselineRequirementModel,
  FeatureReadinessReviewModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  RequirementModel,
  TaskActivityModel,
  TaskDocumentModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Feature readiness baseline HTTP/PostgreSQL integration (P1A)', () => {
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let otherWorkspace: WorkspaceModel;
  let feature: TaskModel;
  let requirement: RequirementModel;
  let productBrief: QaDocumentModel;
  let owner: UserModel;
  let po: UserModel;
  let dev: UserModel;
  let qa: UserModel;
  let unassignedDev: UserModel;
  let outsider: UserModel;
  let ownerCookie: string;
  let poCookie: string;
  let devCookie: string;
  let qaCookie: string;
  let unassignedDevCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'FeatureReadinessIntegration',
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
    [owner, po, dev, qa, unassignedDev, outsider] = await Promise.all([
      UserModel.create({
        email: `readiness-owner-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Readiness Owner',
        role: 'owner',
      }),
      UserModel.create({
        email: `readiness-po-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Readiness PO',
        role: 'po',
      }),
      UserModel.create({
        email: `readiness-dev-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Readiness Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `readiness-qa-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Readiness QA',
        role: 'qa',
      }),
      UserModel.create({
        email: `readiness-unassigned-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Unassigned Dev',
        role: 'dev',
      }),
      UserModel.create({
        email: `readiness-outsider-${stamp}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Outside Owner',
        role: 'owner',
      }),
    ]);

    workspace = await WorkspaceModel.create({
      name: 'Feature Readiness Workspace',
      slug: `feature-readiness-${stamp}`,
      ownerId: owner.id,
    });
    otherWorkspace = await WorkspaceModel.create({
      name: 'Other Readiness Workspace',
      slug: `other-feature-readiness-${stamp}`,
      ownerId: outsider.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
      { workspaceId: workspace.id, userId: unassignedDev.id, role: 'dev' },
      { workspaceId: otherWorkspace.id, userId: outsider.id, role: 'owner' },
    ]);

    feature = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Checkout readiness Feature',
      priority: 'high',
      status: 'todo',
      reporterId: po.id,
    });
    await TaskModel.bulkCreate([
      {
        workspaceId: workspace.id,
        parentTaskId: feature.id,
        deliveryArea: 'backend',
        title: 'Checkout API',
        priority: 'high',
        status: 'todo',
        reporterId: po.id,
        assigneeId: dev.id,
      },
      {
        workspaceId: workspace.id,
        parentTaskId: feature.id,
        deliveryArea: 'qa',
        title: 'Checkout test design',
        priority: 'high',
        status: 'todo',
        reporterId: po.id,
        assigneeId: qa.id,
      },
    ]);

    requirement = await RequirementModel.create({
      workspaceId: workspace.id,
      code: `REQ-READY-${stamp}`,
      title: 'Customer can complete checkout',
      description: 'Checkout returns a clear confirmation.',
      status: 'active',
      createdBy: po.id,
    });
    await AcceptanceCriterionModel.create({
      workspaceId: workspace.id,
      requirementId: requirement.id,
      sequence: 1,
      text: 'Given a valid cart, payment confirmation is displayed.',
      status: 'active',
      createdBy: po.id,
    });
    await TaskRequirementModel.create({
      workspaceId: workspace.id,
      taskId: feature.id,
      requirementId: requirement.id,
      linkedBy: po.id,
    });

    productBrief = await QaDocumentModel.create({
      workspaceId: workspace.id,
      title: 'Checkout Product Brief',
      docType: 'product_brief',
      status: 'approved',
      currentVersion: 1,
      ownerId: po.id,
      createdBy: po.id,
    });
    await QaDocumentVersionModel.create({
      workspaceId: workspace.id,
      documentId: productBrief.id,
      version: 1,
      title: 'Checkout Product Brief',
      contentMarkdown: '## Goal\nCustomers complete checkout without support.',
      inScope: [],
      outScope: [],
      acceptanceCriteria: [],
      createdBy: po.id,
    });
    await TaskDocumentModel.create({
      workspaceId: workspace.id,
      taskId: feature.id,
      documentId: productBrief.id,
      linkType: 'primary_prd',
      linkedBy: po.id,
    });

    [ownerCookie, poCookie, devCookie, qaCookie, unassignedDevCookie, outsiderCookie] =
      await Promise.all([
        authCookie(owner),
        authCookie(po),
        authCookie(dev),
        authCookie(qa),
        authCookie(unassignedDev),
        authCookie(outsider),
      ]);
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await FeatureReadinessBaselineRequirementModel.destroy({
        where: { workspaceId: workspace.id },
      });
      await FeatureReadinessBaselineModel.destroy({ where: { workspaceId: workspace.id } });
      await FeatureReadinessReviewModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskDocumentModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentVersionModel.destroy({ where: { workspaceId: workspace.id } });
      await QaDocumentModel.destroy({ where: { workspaceId: workspace.id } });
      await AcceptanceCriterionModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskRequirementModel.destroy({ where: { workspaceId: workspace.id } });
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await RequirementModel.destroy({ where: { workspaceId: workspace.id } });
    }
    for (const target of [workspace, otherWorkspace]) {
      if (target) await WorkspaceModel.destroy({ where: { id: target.id } });
    }
    for (const user of [owner, po, dev, qa, unassignedDev, outsider]) {
      if (user) await UserModel.destroy({ where: { id: user.id } });
    }
  });

  test('shows content readiness to members but rejects cross-workspace access', async () => {
    const response = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness`,
    );
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as any;
    assert.strictEqual(body.readiness.mode, 'observation');
    assert.deepStrictEqual(
      body.readiness.checks.map((check: any) => check.status),
      ['passed', 'passed', 'passed', 'failed', 'failed'],
    );
    assert.strictEqual(body.readiness.capabilities.canEstablishBaseline, true);
    assert.strictEqual(body.readiness.currentBaseline, null);

    const forbidden = await request(
      outsiderCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness`,
    );
    assert.strictEqual(forbidden.status, 403);
  });

  test('only matching assigned Development and QA members can append valid reviews', async () => {
    const unassigned = await request(
      unassignedDevCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/reviews`,
      { method: 'POST', body: { recommendation: 'ready', notes: 'Looks implementable.' } },
    );
    assert.strictEqual(unassigned.status, 403);

    const invalid = await request(
      devCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/reviews`,
      { method: 'POST', body: { recommendation: 'changes_requested', notes: 'Missing detail.' } },
    );
    assert.strictEqual(invalid.status, 400);

    const devResponse = await request(
      devCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/reviews`,
      {
        method: 'POST',
        body: { recommendation: 'ready', notes: 'API contract and edge cases are clear.' },
      },
    );
    assert.strictEqual(devResponse.status, 201);
    const qaResponse = await request(
      qaCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/reviews`,
      {
        method: 'POST',
        body: { recommendation: 'ready', notes: 'Acceptance Criteria are testable.' },
      },
    );
    assert.strictEqual(qaResponse.status, 201);

    const reviews = await FeatureReadinessReviewModel.findAll({
      where: { workspaceId: workspace.id, featureTaskId: feature.id },
    });
    assert.strictEqual(reviews.length, 2);
    assert.deepStrictEqual(
      new Set(reviews.map((review) => review.reviewerRole)),
      new Set(['dev', 'qa']),
    );
    assert.strictEqual(
      await TaskActivityModel.count({
        where: { taskId: feature.id, action: 'feature.readiness.review_recorded' },
      }),
      2,
    );
  });

  test('PO captures one immutable current baseline and cannot duplicate it', async () => {
    const response = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/baselines`,
      { method: 'POST' },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as any;
    assert.strictEqual(body.baseline.sequence, 1);
    assert.strictEqual(body.baseline.isCurrent, true);
    assert.strictEqual(body.baseline.snapshot.productBrief.version, 1);
    assert.strictEqual(body.baseline.snapshot.requirements.length, 1);
    assert.strictEqual(body.baseline.snapshot.requirements[0].acceptanceCriteria.length, 1);

    const duplicate = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/baselines`,
      { method: 'POST' },
    );
    assert.strictEqual(duplicate.status, 409);

    const baseline = await FeatureReadinessBaselineModel.findOne({
      where: { workspaceId: workspace.id, featureTaskId: feature.id },
    });
    await assert.rejects(() => baseline!.update({ sequence: 99 }));
  });

  test('new Development feedback makes the baseline stale and PO cannot override it', async () => {
    const reviewResponse = await request(
      devCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/reviews`,
      {
        method: 'POST',
        body: {
          recommendation: 'changes_requested',
          notes: 'Retry behavior still needs a product decision.',
          concernSeverity: 'high',
        },
      },
    );
    assert.strictEqual(reviewResponse.status, 201);

    const stateResponse = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness`,
    );
    const state = (await stateResponse.json()) as any;
    assert.strictEqual(state.readiness.currentBaseline.isCurrent, false);
    assert.ok(state.readiness.currentBaseline.staleReasons.includes('dev_review_changed'));
    assert.strictEqual(state.readiness.readyToBaseline, false);

    const forbiddenOverride = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/baselines`,
      {
        method: 'POST',
        body: {
          overrideReason: 'Commercial deadline.',
          overrideExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      },
    );
    assert.strictEqual(forbiddenOverride.status, 403);
  });

  test('Owner records a bounded override while database guards preserve baseline evidence', async () => {
    const response = await request(
      ownerCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness/baselines`,
      {
        method: 'POST',
        body: {
          overrideReason: 'Limited internal pilot while retry policy is finalized.',
          overrideExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      },
    );
    assert.strictEqual(response.status, 201);
    const body = (await response.json()) as any;
    assert.strictEqual(body.baseline.sequence, 2);
    assert.strictEqual(body.baseline.isCurrent, true);
    assert.match(body.baseline.overrideReason, /internal pilot/);

    await assert.rejects(() => requirement.destroy());
    await assert.rejects(() => feature.destroy());
    assert.strictEqual(
      await FeatureReadinessBaselineModel.count({
        where: { workspaceId: workspace.id, featureTaskId: feature.id },
      }),
      2,
    );
  });

  test('reassignment invalidates feedback from the previous Development assignee', async () => {
    const developmentSubtask = await TaskModel.findOne({
      where: { workspaceId: workspace.id, parentTaskId: feature.id, deliveryArea: 'backend' },
    });
    assert.ok(developmentSubtask);
    await developmentSubtask.update({ assigneeId: unassignedDev.id });

    const response = await request(
      poCookie,
      `/workspaces/${workspace.id}/features/${feature.id}/readiness`,
    );
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as any;
    assert.strictEqual(body.readiness.latestReviews.dev, null);
    assert.strictEqual(body.readiness.currentBaseline.isCurrent, false);
    assert.ok(body.readiness.currentBaseline.staleReasons.includes('dev_review_changed'));
  });
});
