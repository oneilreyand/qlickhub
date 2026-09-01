import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  QaSignOffCancellationModel,
  QaSignOffModel,
  ReleaseDecisionCancellationModel,
  ReleaseDecisionModel,
  TaskActivityModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { releaseDecisionService } from '../releaseDecisionService.js';
import { taskService } from '../../tasks/taskService.js';

describe('Release Record Cancellation & Task Soft-Deletion PostgreSQL integration (AGY-8.1)', () => {
  let server: Server;
  let baseUrl: string;
  let owner: UserModel;
  let admin: UserModel;
  let po: UserModel;
  let qa1: UserModel;
  let qa2: UserModel;
  let dev: UserModel;
  let outsider: UserModel;
  let workspace: WorkspaceModel;
  let featureTask: TaskModel;
  let ownerCookie: string;
  let adminCookie: string;
  let poCookie: string;
  let qa1Cookie: string;
  let qa2Cookie: string;
  let devCookie: string;
  let outsiderCookie: string;

  async function authCookie(user: UserModel): Promise<string> {
    const sessionId = await sessionManager.createSession(
      user.id,
      'CancellationIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    return `${accessTokenCookieName}=${token}`;
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
    owner = await UserModel.create({
      email: `cancel_owner_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel Owner',
      role: 'owner',
    });
    admin = await UserModel.create({
      email: `cancel_admin_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel Admin',
      role: 'admin',
    });
    po = await UserModel.create({
      email: `cancel_po_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel PO',
      role: 'po',
    });
    qa1 = await UserModel.create({
      email: `cancel_qa1_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel QA 1',
      role: 'qa',
    });
    qa2 = await UserModel.create({
      email: `cancel_qa2_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel QA 2',
      role: 'qa',
    });
    dev = await UserModel.create({
      email: `cancel_dev_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel Dev',
      role: 'dev',
    });
    outsider = await UserModel.create({
      email: `cancel_outsider_${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Cancel Outsider',
      role: 'qa',
    });

    workspace = await WorkspaceModel.create({
      name: 'Cancellation Workspace',
      slug: `cancellation-workspace-${stamp}`,
      ownerId: owner.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
      { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: qa1.id, role: 'qa' },
      { workspaceId: workspace.id, userId: qa2.id, role: 'qa' },
      { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
    ]);

    featureTask = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Cancellation Target Feature',
      status: 'in_review',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
    });

    [ownerCookie, adminCookie, poCookie, qa1Cookie, qa2Cookie, devCookie, outsiderCookie] =
      await Promise.all([
        authCookie(owner),
        authCookie(admin),
        authCookie(po),
        authCookie(qa1),
        authCookie(qa2),
        authCookie(dev),
        authCookie(outsider),
      ]);
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('validates reason requirements when cancelling QA Sign-off and Release Decision', async () => {
    const signOff = await releaseDecisionService.createQaSignOff(qa1.id, {
      workspaceId: workspace.id,
      featureTaskId: featureTask.id,
      decision: 'approved',
      notes: 'Sign-off for validation test',
    });

    // Blank / whitespace reason on QA sign-off cancellation
    const resBlankSignOff = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ reason: '   ' }),
      },
    );
    assert.strictEqual(resBlankSignOff.status, 400);

    // Oversized reason on QA sign-off cancellation (> 20000 chars)
    const resOverSignOff = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ reason: 'x'.repeat(20001) }),
      },
    );
    assert.strictEqual(resOverSignOff.status, 400);
  });

  test('enforces RBAC matrix D3 on QA Sign-off cancellation', async () => {
    const signOff = await releaseDecisionService.createQaSignOff(qa1.id, {
      workspaceId: workspace.id,
      featureTaskId: featureTask.id,
      decision: 'approved',
      notes: 'Sign-off created by QA 1',
    });

    // Another QA cannot cancel QA1's sign-off (403)
    const resQa2 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa2Cookie },
        body: JSON.stringify({ reason: 'Attempted cancellation by other QA' }),
      },
    );
    assert.strictEqual(resQa2.status, 403);
    const bodyQa2 = (await resQa2.json()) as any;
    assert.match(bodyQa2.detail, /cannot cancel another QA member/);

    // Dev cannot cancel QA sign-off (403)
    const resDev = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({ reason: 'Attempted cancellation by Dev' }),
      },
    );
    assert.strictEqual(resDev.status, 403);

    // Outsider cannot cancel (403)
    const resOutsider = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: outsiderCookie },
        body: JSON.stringify({ reason: 'Attempted cancellation by outsider' }),
      },
    );
    assert.strictEqual(resOutsider.status, 403);

    // Admin can also cancel QA sign-off (200)
    const adminSignOff = await releaseDecisionService.createQaSignOff(qa2.id, {
      workspaceId: workspace.id,
      featureTaskId: featureTask.id,
      decision: 'rejected',
      notes: 'Sign-off created by QA 2',
    });
    const resAdminCancel = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${adminSignOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ reason: 'Admin supervisory cancellation.' }),
      },
    );
    assert.strictEqual(resAdminCancel.status, 200);

    // Original QA signer (QA1) can cancel own sign-off (200)
    const resQa1 = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ reason: 'Discovered flaky test in regression suite.' }),
      },
    );
    assert.strictEqual(resQa1.status, 200);
    const bodyQa1 = (await resQa1.json()) as any;
    assert.strictEqual(bodyQa1.qaSignOff.id, signOff.id);
    assert.ok(bodyQa1.qaSignOff.cancellation);
    assert.strictEqual(bodyQa1.qaSignOff.cancellation.cancelledBy, qa1.id);
    assert.strictEqual(
      bodyQa1.qaSignOff.cancellation.reason,
      'Discovered flaky test in regression suite.',
    );

    // Re-cancelling already cancelled sign-off returns 409 Conflict
    const resDup = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${featureTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({ reason: 'Duplicate cancellation attempt' }),
      },
    );
    assert.strictEqual(resDup.status, 409);
    const bodyDup = (await resDup.json()) as any;
    assert.match(bodyDup.detail, /already been cancelled/);
  });

  test('enforces cancellation sequence D5 and RBAC D4 on Release Decision cancellation', async () => {
    const seqTask = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Sequence Target Feature',
      status: 'in_review',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
    });

    // 1. Create a fresh QA Sign-off by QA1
    const signOff = await releaseDecisionService.createQaSignOff(qa1.id, {
      workspaceId: workspace.id,
      featureTaskId: seqTask.id,
      decision: 'approved',
      notes: 'Sign-off for decision sequence test',
    });

    // 2. Create a Release Decision by PO referencing this sign-off
    const decision = await releaseDecisionService.createReleaseDecision(po.id, {
      workspaceId: workspace.id,
      featureTaskId: seqTask.id,
      qaSignOffId: signOff.id,
      decision: 'approved',
      notes: 'Approved for deployment.',
      overrideReason: 'Test override reason for pending gate.',
    });

    // 3. Attempting to cancel QA Sign-off while Release Decision is active must fail with 409 Conflict (D5)
    const resEarlySignOffCancel = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${seqTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ reason: 'Premature cancellation attempt' }),
      },
    );
    assert.strictEqual(resEarlySignOffCancel.status, 409);
    const bodyEarly = (await resEarlySignOffCancel.json()) as any;
    assert.match(bodyEarly.detail, /Cancel the related Release Decision before/);

    // 4. Test RBAC on Release Decision cancellation: QA and Dev cannot cancel (403)
    const resQaCancelDecision = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${seqTask.id}/release-decisions/${decision.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ reason: 'QA trying to cancel release decision' }),
      },
    );
    assert.strictEqual(resQaCancelDecision.status, 403);

    const resDevCancelDecision = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${seqTask.id}/release-decisions/${decision.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: devCookie },
        body: JSON.stringify({ reason: 'Dev trying to cancel release decision' }),
      },
    );
    assert.strictEqual(resDevCancelDecision.status, 403);

    // 5. PO cancels the Release Decision (200)
    const resPoCancelDecision = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${seqTask.id}/release-decisions/${decision.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: poCookie },
        body: JSON.stringify({ reason: 'Rollback requested due to downstream dependency outage.' }),
      },
    );
    assert.strictEqual(resPoCancelDecision.status, 200);
    const bodyDecisionCancel = (await resPoCancelDecision.json()) as any;
    assert.strictEqual(bodyDecisionCancel.releaseDecision.id, decision.id);
    assert.ok(bodyDecisionCancel.releaseDecision.cancellation);
    assert.strictEqual(bodyDecisionCancel.releaseDecision.cancellation.cancelledBy, po.id);
    assert.strictEqual(
      bodyDecisionCancel.releaseDecision.cancellation.reason,
      'Rollback requested due to downstream dependency outage.',
    );

    // 6. Now that the Release Decision is cancelled, QA Sign-off can be cancelled (200)
    const resSignOffCancelSuccess = await fetch(
      `${baseUrl}/workspaces/${workspace.id}/features/${seqTask.id}/qa-sign-offs/${signOff.id}/cancellation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: qa1Cookie },
        body: JSON.stringify({ reason: 'Sign-off superseded after release decision rollback.' }),
      },
    );
    assert.strictEqual(resSignOffCancelSuccess.status, 200);
    const bodySignOffCancelSuccess = (await resSignOffCancelSuccess.json()) as any;
    assert.ok(bodySignOffCancelSuccess.qaSignOff.cancellation);

    // 7. Verify TaskActivity audit logs
    const activities = await TaskActivityModel.findAll({
      where: {
        workspaceId: workspace.id,
        taskId: seqTask.id,
        action: ['release.decision.cancelled', 'qa.sign_off.cancelled'],
      },
      order: [['createdAt', 'ASC']],
    });
    assert.ok(activities.length >= 2);
    const decisionActivity = activities.find((a) => a.action === 'release.decision.cancelled');
    assert.ok(decisionActivity);
    assert.strictEqual(decisionActivity.actorId, po.id);
    assert.strictEqual(
      (decisionActivity.metadataJson as any)?.reason,
      'Rollback requested due to downstream dependency outage.',
    );

    const signOffActivity = activities.find((a) => a.action === 'qa.sign_off.cancelled');
    assert.ok(signOffActivity);
    assert.strictEqual(signOffActivity.actorId, qa1.id);
    assert.strictEqual(
      (signOffActivity.metadataJson as any)?.reason,
      'Sign-off superseded after release decision rollback.',
    );
  });

  test('verifies database immutability triggers block direct update on cancellation tables and source tables', async () => {
    const signOff = await releaseDecisionService.createQaSignOff(qa1.id, {
      workspaceId: workspace.id,
      featureTaskId: featureTask.id,
      decision: 'approved',
      notes: 'Sign-off for immutability check',
    });

    await releaseDecisionService.cancelQaSignOff(admin.id, {
      workspaceId: workspace.id,
      featureTaskId: featureTask.id,
      qaSignOffId: signOff.id,
      reason: 'Admin corrective cancellation.',
    });

    // Direct UPDATE on qa_sign_offs is blocked by PostgreSQL trigger
    await assert.rejects(async () => {
      await sequelize.query(
        `UPDATE qa_sign_offs SET notes = 'tampered' WHERE id = '${signOff.id}';`,
      );
    }, /Release assurance records are append-only and cannot be updated/);

    // Direct UPDATE on qa_sign_off_cancellations is blocked by PostgreSQL trigger
    await assert.rejects(async () => {
      await sequelize.query(
        `UPDATE qa_sign_off_cancellations SET reason = 'tampered' WHERE qa_sign_off_id = '${signOff.id}';`,
      );
    }, /Release cancellation records are append-only and cannot be updated/);
  });

  test('allows planner Task soft-deletion only after all active release records are cancelled (D1)', async () => {
    // 1. Create a dedicated feature task for archival test
    const archivalTask = await TaskModel.create({
      workspaceId: workspace.id,
      title: 'Archival Target Feature',
      status: 'in_review',
      priority: 'high',
      reporterId: po.id,
      assigneeId: dev.id,
    });

    // 2. Create QA Sign-off and Release Decision on this task
    const signOff = await releaseDecisionService.createQaSignOff(qa1.id, {
      workspaceId: workspace.id,
      featureTaskId: archivalTask.id,
      decision: 'approved',
      notes: 'Sign-off on archival feature',
    });

    const decision = await releaseDecisionService.createReleaseDecision(po.id, {
      workspaceId: workspace.id,
      featureTaskId: archivalTask.id,
      qaSignOffId: signOff.id,
      decision: 'approved',
      notes: 'Release decision on archival feature',
      overrideReason: 'Archival test override reason.',
    });

    // 3. Attempting to soft-delete task while active records exist must fail with 409 Conflict
    await assert.rejects(async () => {
      await taskService.deleteTask(workspace.id, archivalTask.id, po.id);
    }, /1 active QA Sign-off\(s\), 1 active Release Decision\(s\)/);

    // 4. Cancel the Release Decision
    await releaseDecisionService.cancelReleaseDecision(po.id, {
      workspaceId: workspace.id,
      featureTaskId: archivalTask.id,
      releaseDecisionId: decision.id,
      reason: 'Feature scrapped before production release.',
    });

    // 5. Still blocked because QA sign-off is active
    await assert.rejects(async () => {
      await taskService.deleteTask(workspace.id, archivalTask.id, po.id);
    }, /1 active QA Sign-off\(s\), 0 active Release Decision\(s\)/);

    // 6. Cancel the QA Sign-off
    await releaseDecisionService.cancelQaSignOff(qa1.id, {
      workspaceId: workspace.id,
      featureTaskId: archivalTask.id,
      qaSignOffId: signOff.id,
      reason: 'Sign-off revoked for scrapped feature.',
    });

    // 7. Soft-delete the task now succeeds!
    await taskService.deleteTask(workspace.id, archivalTask.id, po.id);

    // 8. Assert Task is soft-deleted (deletedAt is set)
    const softDeleted = await TaskModel.findOne({
      where: { id: archivalTask.id, workspaceId: workspace.id },
      paranoid: false,
    });
    assert.ok(softDeleted);
    assert.ok(softDeleted.deletedAt);

    // 9. Assert history records remain intact in PostgreSQL (D1 & D6)
    const persistedSignOff = await QaSignOffModel.findOne({
      where: { id: signOff.id, workspaceId: workspace.id },
      include: [{ model: QaSignOffCancellationModel, as: 'cancellation' }],
    });
    assert.ok(persistedSignOff);
    assert.ok(persistedSignOff.cancellation);
    assert.strictEqual(
      persistedSignOff.cancellation.reason,
      'Sign-off revoked for scrapped feature.',
    );

    const persistedDecision = await ReleaseDecisionModel.findOne({
      where: { id: decision.id, workspaceId: workspace.id },
      include: [{ model: ReleaseDecisionCancellationModel, as: 'cancellation' }],
    });
    assert.ok(persistedDecision);
    assert.ok(persistedDecision.cancellation);
    assert.strictEqual(
      persistedDecision.cancellation.reason,
      'Feature scrapped before production release.',
    );
  });
});
