import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { LeaderPipelineSummarySchema, type LeaderPipelineSummary } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskActivityModel,
  TaskBlockerModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * LEADER-PIPELINE-HUB P1 (ADR-045): pipeline summary over HTTP on PostgreSQL; no mocks.
 * AC-1.1 stage + age, AC-1.2 health with reasons, AC-1.3 Owner/Admin only.
 */
describe('Leader pipeline summary HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  const ws: Record<string, WorkspaceModel> = {};
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};
  const features: Record<string, TaskModel> = {};

  async function user(key: string) {
    users[key] = await UserModel.create({
      email: `${key}-pipeline-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Pipeline ${key}`,
      role: 'admin',
    });
    const sessionId = await sessionManager.createSession(
      users[key].id,
      'PipelineTest',
      '127.0.0.1',
    );
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: users[key].id, email: users[key].email, role: users[key].role, sessionId })}`;
  }

  const feature = (key: string, workspace: string, title: string, status = 'in_progress') =>
    TaskModel.create({
      workspaceId: ws[workspace].id,
      title,
      status: status as never,
      priority: 'medium',
      reporterId: users.lead.id,
    }).then((task) => (features[key] = task));

  const subtask = (
    featureKey: string,
    title: string,
    extra: Partial<Record<string, unknown>> = {},
  ) =>
    TaskModel.create({
      workspaceId: features[featureKey].workspaceId,
      parentTaskId: features[featureKey].id,
      deliveryArea: 'backend',
      title,
      status: 'in_progress',
      priority: 'medium',
      reporterId: users.lead.id,
      assigneeId: users.dev.id,
      startDate: '2026-11-16',
      dueDate: '2099-12-31',
      effort: 'm',
      ...extra,
    } as never);

  const summary = async (actor: string, query = '') => {
    const response = await fetch(`${baseUrl}/leader/pipeline${query}`, {
      headers: { Cookie: cookies[actor] },
    });
    const body = (await response.json()) as { data?: unknown };
    return {
      status: response.status,
      data: response.ok
        ? LeaderPipelineSummarySchema.parse(body.data)
        : (null as unknown as LeaderPipelineSummary),
    };
  };

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
    await user('lead');
    await user('dev');
    await user('po');
    for (const key of ['alpha', 'beta', 'other']) {
      ws[key] = await WorkspaceModel.create({
        name: `Pipeline ${key} ${stamp}`,
        slug: `pipeline-${key}-${stamp}`,
        ownerId: users.lead.id,
      });
    }
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: ws.alpha.id, userId: users.lead.id, role: 'owner' },
      { workspaceId: ws.beta.id, userId: users.lead.id, role: 'admin' },
      { workspaceId: ws.other.id, userId: users.lead.id, role: 'po' },
      { workspaceId: ws.alpha.id, userId: users.dev.id, role: 'dev' },
      { workspaceId: ws.beta.id, userId: users.dev.id, role: 'dev' },
      { workspaceId: ws.alpha.id, userId: users.po.id, role: 'po' },
    ]);

    await feature('healthy', 'alpha', 'Top-up');
    await subtask('healthy', 'Form top-up');

    await feature('blocked', 'alpha', 'Refund otomatis');
    const refund = await subtask('blocked', 'API refund');
    await TaskBlockerModel.create({
      workspaceId: ws.alpha.id,
      taskId: refund.id,
      category: 'external',
      description: 'Menunggu akses sandbox bank',
      picUserId: users.po.id,
      openedBy: users.dev.id,
      openedAt: new Date(Date.now() - 4 * 86_400_000),
    });

    await feature('risky', 'beta', 'Pembayaran QRIS');
    const qris = await subtask('risky', 'Callback QRIS', { status: 'in_review' });
    for (let i = 0; i < 2; i += 1) {
      await TaskActivityModel.create({
        workspaceId: ws.beta.id,
        taskId: qris.id,
        actorId: users.lead.id,
        action: 'subtask.status_updated',
        metadataJson: { changes: { status: { old: 'in_review', new: 'changes_requested' } } },
      });
    }

    await feature('planning', 'beta', 'Dashboard ops');
    await feature('closed', 'beta', 'Fitur lama', 'done');
    await feature('elsewhere', 'other', 'Bukan urusan leader');
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-1.1 / AC-1.2: stage, age, health and reasons per Feature in led Workspaces only', async () => {
    const { status, data } = await summary('lead');
    assert.strictEqual(status, 200);
    const byName = new Map(data.features.map((f) => [f.featureName, f]));
    assert.deepStrictEqual(
      [...byName.keys()].sort(),
      ['Dashboard ops', 'Pembayaran QRIS', 'Refund otomatis', 'Top-up'],
      'done Feature without a recent release and unled Workspace are excluded',
    );

    const refund = byName.get('Refund otomatis')!;
    assert.strictEqual(refund.health, 'blocked');
    assert.strictEqual(refund.currentStage, 'dev');
    assert.strictEqual(refund.stages.dev?.state, 'held');
    assert.strictEqual(refund.reasons[0].code, 'open_blocker');
    assert.match(refund.reasons[0].message, /Pipeline po/);

    const qris = byName.get('Pembayaran QRIS')!;
    assert.strictEqual(qris.currentStage, 'review');
    assert.strictEqual(qris.health, 'at_risk');
    assert.deepStrictEqual(
      qris.reasons.map((r) => r.code),
      ['changes_requested_repeated'],
    );

    const topup = byName.get('Top-up')!;
    assert.strictEqual(topup.health, 'on_track');
    assert.deepStrictEqual(topup.stages.dev, { state: 'active', days: 0 });
    assert.deepStrictEqual(topup.stages.prodVerify, { state: 'untracked' });

    assert.strictEqual(byName.get('Dashboard ops')!.currentStage, 'plan');

    assert.deepStrictEqual(data.stats, {
      activeFeatures: 4,
      onTrack: 2,
      atRisk: 1,
      blocked: 1,
      openBlockers: 1,
      openBlockerAverageAgeDays: 4,
    });
    assert.strictEqual(data.openBlockers[0].taskTitle, 'API refund');
    assert.strictEqual(data.openBlockers[0].picName, 'Pipeline po');
    assert.strictEqual(data.features[0].health, 'blocked', 'blocked Features come first');
  });

  test('Workspace filter narrows the summary', async () => {
    const { data } = await summary('lead', `?workspaceIds=${ws.beta.id}`);
    assert.deepStrictEqual(
      data.workspaces.map((w) => w.id),
      [ws.beta.id],
    );
    assert.strictEqual(data.stats.activeFeatures, 2);
  });

  test('AC-1.3: non-leaders get 403; a Workspace the actor does not lead cannot be requested', async () => {
    assert.strictEqual((await summary('dev')).status, 403);
    assert.strictEqual((await summary('po')).status, 403);
    assert.strictEqual((await summary('lead', `?workspaceIds=${ws.other.id}`)).status, 403);
    assert.strictEqual((await summary('lead', '?workspaceIds=not-a-uuid')).status, 400);
  });
});
