import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import {
  NotificationModel,
  NotificationOutboxModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { createOpportunisticOutboxDispatch } from '../opportunisticOutboxDispatch.js';
import { notificationRoutes } from '../notificationRoutes.js';
import { opportunisticOutboxDispatch } from '../opportunisticOutboxDispatch.js';

describe('Opportunistic outbox retry (audit F3)', () => {
  test('runs at most one batch per interval and never overlaps', async () => {
    let clock = 0;
    const calls: number[] = [];
    let release: () => void = () => {};
    const dispatcher = createOpportunisticOutboxDispatch({
      enabled: true,
      intervalMs: 60_000,
      batchSize: 7,
      now: () => clock,
      dispatchDue: (limit) => {
        calls.push(limit);
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    });

    const first = dispatcher.trigger();
    assert.ok(first);
    clock = 120_000;
    assert.equal(dispatcher.trigger(), null, 'no second run while the first is in flight');
    release();
    await first;
    clock = 130_000;
    assert.ok(dispatcher.trigger(), 'interval elapsed after the first run started');
    release();
    clock = 150_000;
    assert.equal(dispatcher.trigger(), null, 'throttled inside the interval');
    assert.deepEqual(calls, [7, 7]);
  });

  test('swallows dispatch errors and respects the wait budget', async () => {
    const errors: unknown[] = [];
    const failing = createOpportunisticOutboxDispatch({
      enabled: true,
      dispatchDue: () => Promise.reject(new Error('provider down')),
      onError: (error) => errors.push(error),
    });
    await failing.trigger();
    assert.equal(errors.length, 1);

    const slow = createOpportunisticOutboxDispatch({
      enabled: true,
      waitBudgetMs: 20,
      dispatchDue: () => new Promise<void>((resolve) => setTimeout(resolve, 500)),
    });
    const started = Date.now();
    let nextCalled = false;
    await slow.middleware({} as never, {} as never, () => {
      nextCalled = true;
    });
    assert.ok(nextCalled);
    assert.ok(Date.now() - started < 300, 'request does not wait for a slow batch');
  });

  test('is disabled by default in the test environment', () => {
    assert.equal(createOpportunisticOutboxDispatch().trigger(), null);
  });

  test('the notification list route runs the dispatcher before the controller', () => {
    type Layer = {
      route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] };
    };
    const route = (notificationRoutes.stack as Layer[]).find(
      (layer) => layer.route?.path === '/notifications' && layer.route.methods.get,
    )?.route;
    assert.ok(route);
    assert.ok(route.stack.some((entry) => entry.handle === opportunisticOutboxDispatch.middleware));
  });
});

describe('Opportunistic outbox retry against PostgreSQL (audit F3)', () => {
  let server: Server;
  let base: string;
  let outboxId: string;
  let recipientId: string;

  before(async () => {
    const stamp = Date.now();
    const recipient = await UserModel.create({
      email: `opportunistic_outbox_${stamp}@test.com`,
      name: 'Opportunistic Outbox Recipient',
      role: 'po',
      passwordHash: 'dummy',
    });
    const workspace = await WorkspaceModel.create({
      name: 'Opportunistic Outbox Workspace',
      slug: `opportunistic-outbox-${stamp}`,
      ownerId: recipient.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: recipient.id,
      role: 'owner',
    });
    recipientId = recipient.id;
    const failed = await NotificationOutboxModel.create({
      workspaceId: workspace.id,
      recipientUserId: recipient.id,
      actorId: recipient.id,
      eventKey: `test-opportunistic-retry:${stamp}`,
      notificationType: 'release_decision',
      title: 'Retry me',
      message: 'A previously failed delivery is due again.',
      deliveryStatus: 'failed',
      attempts: 1,
      nextAttemptAt: new Date(Date.now() - 1_000),
      lastError: 'Simulated provider failure.',
    });
    outboxId = failed.id;

    const dispatcher = createOpportunisticOutboxDispatch({ enabled: true, waitBudgetMs: 5_000 });
    const app = express();
    app.get('/poll', dispatcher.middleware, (_req, res) => {
      res.json({ ok: true });
    });
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('a user request delivers a due failed outbox row and persists the notification', async () => {
    const response = await fetch(`${base}/poll`);
    assert.equal(response.status, 200);
    const row = await NotificationOutboxModel.findByPk(outboxId);
    assert.ok(row);
    assert.equal(row.deliveryStatus, 'delivered');
    assert.equal(row.attempts, 2);
    const delivered = await NotificationModel.findOne({
      where: { userId: recipientId, title: 'Retry me' },
    });
    assert.ok(delivered, 'notification row persisted for the recipient');
  });
});
