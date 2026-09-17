import { sequelize } from '../db/sequelize.js';
import { reliableNotificationOutboxService } from '../modules/notifications/reliableNotificationOutboxService.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const usage = (): never => {
  throw new Error('Usage: notificationOutboxAdmin <summary|dead-letters|requeue> [outbox-id ...]');
};

const run = async (): Promise<void> => {
  const [command, ...outboxIds] = process.argv.slice(2);
  await sequelize.authenticate();
  try {
    if (command === 'summary') {
      console.log(await reliableNotificationOutboxService.getDeliverySummary());
      return;
    }

    if (command === 'dead-letters') {
      const rows = await reliableNotificationOutboxService.listDeadLetters();
      console.table(
        rows.map((row) => ({
          id: row.id,
          eventKey: row.eventKey,
          recipientUserId: row.recipientUserId,
          type: row.notificationType,
          attempts: row.attempts,
          deadLetteredAt: row.deadLetteredAt?.toISOString() || null,
          lastError: row.lastError,
        })),
      );
      return;
    }

    if (command === 'requeue') {
      if (outboxIds.length === 0 || outboxIds.some((id) => !UUID_PATTERN.test(id))) usage();
      const requeued = await reliableNotificationOutboxService.requeueDeadLetters(outboxIds);
      console.log(`Requeued ${requeued} dead-letter notification(s).`);
      return;
    }

    usage();
  } finally {
    await sequelize.close();
  }
};

if (process.argv[1]?.endsWith('notificationOutboxAdmin.js')) {
  run().catch((error) => {
    console.error(
      'Notification outbox admin command failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
