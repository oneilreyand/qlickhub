import { Op, fn, col, type Transaction } from 'sequelize';
import type { NotificationType } from '@qlick/contracts';
import { NotificationOutboxModel, type NotificationDeliveryStatus } from '../../db/models/index.js';
import { sequelize } from '../../db/sequelize.js';
import { notificationService } from './notificationService.js';

export interface OutboxRecipient {
  userId: string;
  workspaceId: string;
  taskId?: string | null;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, string>;
}

const MAX_DELIVERY_ATTEMPTS = 8;

/**
 * Durable notification boundary. Enqueue is part of the caller's business
 * transaction; delivery happens only after that transaction has committed.
 */
export class ReliableNotificationOutboxService {
  async enqueue(
    eventKey: string,
    recipients: OutboxRecipient[],
    transaction: Transaction,
  ): Promise<string[]> {
    const uniqueRecipients = [
      ...new Map(recipients.map((recipient) => [recipient.userId, recipient])).values(),
    ];
    if (uniqueRecipients.length === 0) return [];
    await NotificationOutboxModel.bulkCreate(
      uniqueRecipients.map((recipient) => ({
        workspaceId: recipient.workspaceId,
        taskId: recipient.taskId || null,
        actorId: recipient.actorId || null,
        recipientUserId: recipient.userId,
        eventKey,
        notificationType: recipient.type,
        title: recipient.title,
        message: recipient.message,
        payloadJson: recipient.payload || {},
      })),
      { transaction, ignoreDuplicates: true },
    );
    const rows = await NotificationOutboxModel.findAll({
      where: {
        eventKey,
        recipientUserId: { [Op.in]: uniqueRecipients.map((recipient) => recipient.userId) },
      },
      attributes: ['id'],
      transaction,
    });
    return rows.map((row) => row.id);
  }

  async dispatch(outboxIds: string[]): Promise<void> {
    if (outboxIds.length === 0) return;
    const leaseUntil = new Date(Date.now() + 5 * 60_000);
    const rows = await sequelize.transaction(async (transaction) => {
      const candidates = await NotificationOutboxModel.findAll({
        where: {
          id: { [Op.in]: outboxIds },
          deliveryStatus: { [Op.in]: ['pending', 'failed', 'processing'] },
          nextAttemptAt: { [Op.lte]: new Date() },
        },
        order: [['createdAt', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
        transaction,
      });
      for (const row of candidates) {
        await row.update(
          {
            deliveryStatus: 'processing',
            attempts: row.attempts + 1,
            nextAttemptAt: leaseUntil,
          },
          { transaction },
        );
      }
      return candidates;
    });
    for (const row of rows) {
      try {
        await notificationService.createNotification({
          userId: row.recipientUserId,
          workspaceId: row.workspaceId,
          taskId: row.taskId,
          actorId: row.actorId,
          idempotencyKey: `${row.eventKey}:${row.recipientUserId}`,
          type: row.notificationType,
          title: row.title,
          message: row.message,
          sendFcm: true,
        });
        await row.update({
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
          deadLetteredAt: null,
          lastError: null,
          nextAttemptAt: new Date(),
        });
      } catch (error) {
        const exhausted = row.attempts >= MAX_DELIVERY_ATTEMPTS;
        const backoffMinutes = Math.min(60, 2 ** Math.min(row.attempts, 6));
        await row.update({
          deliveryStatus: exhausted ? 'dead_letter' : 'failed',
          nextAttemptAt: exhausted ? new Date() : new Date(Date.now() + backoffMinutes * 60_000),
          deadLetteredAt: exhausted ? new Date() : null,
          lastError:
            error instanceof Error ? error.message.slice(0, 10_000) : 'Unknown delivery error.',
        });
      }
    }
  }

  async dispatchDue(limit = 100): Promise<void> {
    const rows = await NotificationOutboxModel.findAll({
      where: {
        deliveryStatus: { [Op.in]: ['pending', 'failed', 'processing'] },
        nextAttemptAt: { [Op.lte]: new Date() },
      },
      attributes: ['id'],
      order: [['createdAt', 'ASC']],
      limit,
    });
    await this.dispatch(rows.map((row) => row.id));
  }

  async getDeliverySummary(): Promise<Record<NotificationDeliveryStatus, number>> {
    const rows = await NotificationOutboxModel.findAll({
      attributes: ['deliveryStatus', [fn('COUNT', col('id')), 'count']],
      group: ['deliveryStatus'],
      raw: true,
    });
    const summary: Record<NotificationDeliveryStatus, number> = {
      pending: 0,
      processing: 0,
      delivered: 0,
      failed: 0,
      dead_letter: 0,
    };
    for (const row of rows as unknown as Array<{
      deliveryStatus: NotificationDeliveryStatus;
      count: string;
    }>) {
      summary[row.deliveryStatus] = Number(row.count);
    }
    return summary;
  }

  async listDeadLetters(limit = 100): Promise<NotificationOutboxModel[]> {
    return NotificationOutboxModel.findAll({
      where: { deliveryStatus: 'dead_letter' },
      order: [['deadLetteredAt', 'DESC']],
      limit: Math.min(Math.max(limit, 1), 500),
    });
  }

  async requeueDeadLetters(outboxIds: string[]): Promise<number> {
    if (outboxIds.length === 0) return 0;
    const [updated] = await NotificationOutboxModel.update(
      {
        deliveryStatus: 'pending',
        nextAttemptAt: new Date(),
        deadLetteredAt: null,
        lastError: null,
      },
      {
        where: {
          id: { [Op.in]: outboxIds },
          deliveryStatus: 'dead_letter',
        },
      },
    );
    return updated;
  }
}

export const reliableNotificationOutboxService = new ReliableNotificationOutboxService();
