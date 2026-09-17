import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  NotificationModel,
  NotificationOutboxModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { sequelize } from '../../../db/sequelize.js';
import { reliableNotificationOutboxService } from '../reliableNotificationOutboxService.js';

describe('Reliable notification outbox', () => {
  let workspaceId: string;
  let actorId: string;
  let recipientAId: string;
  let recipientBId: string;

  before(async () => {
    const timestamp = Date.now();
    const [actor, recipientA, recipientB] = await Promise.all([
      UserModel.create({
        email: `outbox_actor_${timestamp}@test.com`,
        name: 'Outbox Actor',
        role: 'qa',
        passwordHash: 'dummy',
      }),
      UserModel.create({
        email: `outbox_a_${timestamp}@test.com`,
        name: 'Outbox Recipient A',
        role: 'dev',
        passwordHash: 'dummy',
      }),
      UserModel.create({
        email: `outbox_b_${timestamp}@test.com`,
        name: 'Outbox Recipient B',
        role: 'po',
        passwordHash: 'dummy',
      }),
    ]);
    const workspace = await WorkspaceModel.create({
      name: 'Notification Outbox Workspace',
      slug: `notification-outbox-${timestamp}`,
      ownerId: recipientB.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspace.id, userId: actor.id, role: 'qa' },
      { workspaceId: workspace.id, userId: recipientA.id, role: 'dev' },
      { workspaceId: workspace.id, userId: recipientB.id, role: 'owner' },
    ]);
    workspaceId = workspace.id;
    actorId = actor.id;
    recipientAId = recipientA.id;
    recipientBId = recipientB.id;
  });

  test('deduplicates recipients inside one transactional event', async () => {
    const eventKey = `test-outbox-dedup:${workspaceId}`;
    const outboxIds = await sequelize.transaction((transaction) =>
      reliableNotificationOutboxService.enqueue(
        eventKey,
        [
          {
            userId: recipientAId,
            workspaceId,
            actorId,
            type: 'qa_signoff',
            title: 'QA Sign-off',
            message: 'QA sign-off tersedia.',
          },
          {
            userId: recipientAId,
            workspaceId,
            actorId,
            type: 'qa_signoff',
            title: 'QA Sign-off',
            message: 'QA sign-off tersedia.',
          },
          {
            userId: recipientBId,
            workspaceId,
            actorId,
            type: 'qa_signoff',
            title: 'QA Sign-off',
            message: 'QA sign-off tersedia.',
          },
        ],
        transaction,
      ),
    );

    assert.equal(outboxIds.length, 2);
    assert.equal(await NotificationOutboxModel.count({ where: { eventKey } }), 2);
  });

  test('re-dispatch does not duplicate in-app notifications', async () => {
    const eventKey = `test-outbox-idempotency:${workspaceId}`;
    const outboxIds = await sequelize.transaction((transaction) =>
      reliableNotificationOutboxService.enqueue(
        eventKey,
        [recipientAId, recipientBId].map((userId) => ({
          userId,
          workspaceId,
          actorId,
          type: 'release_decision' as const,
          title: 'Release Decision',
          message: 'Keputusan rilis tersedia.',
        })),
        transaction,
      ),
    );

    await reliableNotificationOutboxService.dispatch(outboxIds);
    await reliableNotificationOutboxService.dispatch(outboxIds);

    assert.equal(
      await NotificationModel.count({ where: { workspaceId, title: 'Release Decision' } }),
      2,
    );
    const rows = await NotificationOutboxModel.findAll({ where: { eventKey } });
    assert.ok(rows.every((row) => row.deliveryStatus === 'delivered'));
    assert.ok(rows.every((row) => row.attempts === 1));
  });

  test('concurrent dispatchers claim an outbox row only once', async () => {
    const eventKey = `test-outbox-concurrency:${workspaceId}`;
    const outboxIds = await sequelize.transaction((transaction) =>
      reliableNotificationOutboxService.enqueue(
        eventKey,
        [
          {
            userId: recipientAId,
            workspaceId,
            actorId,
            type: 'qa_signoff',
            title: 'Concurrent QA Sign-off',
            message: 'Only one dispatcher may deliver this event.',
          },
        ],
        transaction,
      ),
    );

    await Promise.all([
      reliableNotificationOutboxService.dispatch(outboxIds),
      reliableNotificationOutboxService.dispatch(outboxIds),
    ]);

    const [row] = await NotificationOutboxModel.findAll({ where: { eventKey } });
    assert.equal(row.deliveryStatus, 'delivered');
    assert.equal(row.attempts, 1);
    assert.equal(
      await NotificationModel.count({
        where: { idempotencyKey: `${eventKey}:${recipientAId}` },
      }),
      1,
    );
  });

  test('reclaims a processing row after its lease expires', async () => {
    const eventKey = `test-outbox-lease-recovery:${workspaceId}`;
    const stale = await NotificationOutboxModel.create({
      workspaceId,
      recipientUserId: recipientBId,
      actorId,
      eventKey,
      notificationType: 'release_decision',
      title: 'Lease recovery',
      message: 'An expired lease must be recoverable.',
      deliveryStatus: 'processing',
      attempts: 2,
      nextAttemptAt: new Date(Date.now() - 1_000),
    });

    await reliableNotificationOutboxService.dispatchDue(10);

    const delivered = await NotificationOutboxModel.findByPk(stale.id);
    assert.ok(delivered);
    assert.equal(delivered.deliveryStatus, 'delivered');
    assert.equal(delivered.attempts, 3);
    assert.ok(delivered.deliveredAt);
  });

  test('lists and explicitly requeues dead letters without resetting attempt history', async () => {
    const deadLetter = await NotificationOutboxModel.create({
      workspaceId,
      recipientUserId: recipientAId,
      actorId,
      eventKey: `test-outbox-dead-letter:${workspaceId}`,
      notificationType: 'bug_status_change',
      title: 'Bug delivery failed',
      message: 'Delivery exhausted its retry budget.',
      deliveryStatus: 'dead_letter',
      attempts: 8,
      deadLetteredAt: new Date(),
      nextAttemptAt: new Date(),
      lastError: 'Simulated provider failure.',
    });

    const [summary, deadLetters] = await Promise.all([
      reliableNotificationOutboxService.getDeliverySummary(),
      reliableNotificationOutboxService.listDeadLetters(),
    ]);
    assert.ok(summary.dead_letter >= 1);
    assert.ok(deadLetters.some((row) => row.id === deadLetter.id));

    const requeued = await reliableNotificationOutboxService.requeueDeadLetters([deadLetter.id]);
    assert.equal(requeued, 1);

    const restored = await NotificationOutboxModel.findByPk(deadLetter.id);
    assert.ok(restored);
    assert.equal(restored.deliveryStatus, 'pending');
    assert.equal(restored.attempts, 8);
    assert.equal(restored.deadLetteredAt, null);
    assert.equal(restored.lastError, null);
  });

  test('preserves Workspace scope when a referenced Task is physically deleted', async () => {
    const task = await TaskModel.create({
      workspaceId,
      title: 'Disposable outbox task',
      reporterId: actorId,
      status: 'todo',
      priority: 'medium',
    });
    const outbox = await NotificationOutboxModel.create({
      workspaceId,
      taskId: task.id,
      recipientUserId: recipientAId,
      actorId,
      eventKey: `test-outbox-task-delete:${task.id}`,
      notificationType: 'bug_status_change',
      title: 'Task-linked notification',
      message: 'Outbox preserves its Workspace after Task deletion.',
    });

    await task.destroy({ force: true });

    const retained = await NotificationOutboxModel.findByPk(outbox.id);
    assert.ok(retained);
    assert.equal(retained.taskId, null);
    assert.equal(retained.workspaceId, workspaceId);
  });
});
