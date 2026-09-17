import { sequelize } from '../db/sequelize.js';
import { reliableNotificationOutboxService } from '../modules/notifications/reliableNotificationOutboxService.js';

const DEFAULT_BATCH_SIZE = 100;

const parseBatchSize = (value: string | undefined): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : DEFAULT_BATCH_SIZE;
};

export const dispatchNotificationOutboxBatch = async (
  batchSize = parseBatchSize(process.env.NOTIFICATION_OUTBOX_BATCH_SIZE),
): Promise<void> => {
  await sequelize.authenticate();
  await reliableNotificationOutboxService.dispatchDue(batchSize);
};

const run = async (): Promise<void> => {
  try {
    const batchSize = parseBatchSize(process.env.NOTIFICATION_OUTBOX_BATCH_SIZE);
    await dispatchNotificationOutboxBatch(batchSize);
    const summary = await reliableNotificationOutboxService.getDeliverySummary();
    console.log('Notification outbox dispatch completed.', { batchSize, summary });
  } finally {
    await sequelize.close();
  }
};

if (process.argv[1]?.endsWith('notificationOutboxWorker.js')) {
  run().catch((error) => {
    console.error(
      'Notification outbox dispatch failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
