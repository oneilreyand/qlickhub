'use strict';

/**
 * E2E-SDLC-FLOW P6. Additive: `notifications.bug_id` lets a Bug notification open the Bug work
 * page instead of the Feature. The FK keeps the Workspace boundary and only clears `bug_id` when a
 * Bug is deleted (the notification stays and falls back to its task).
 *
 * Backfill (K6): every Bug event already stored its Bug id in `notification_outbox.payload_json`,
 * and the delivered notification's `idempotency_key` is `<event_key>:<recipient_user_id>`.
 * Only Bugs that still exist in the same Workspace are linked.
 */
const BACKFILL_SQL = `UPDATE notifications n
            SET bug_id = b.id
           FROM notification_outbox o
           JOIN bugs b
             ON b.workspace_id = o.workspace_id
            AND b.id::text = o.payload_json->>'bugId'
          WHERE n.bug_id IS NULL
            AND n.idempotency_key = o.event_key || ':' || o.recipient_user_id::text
            AND n.workspace_id = o.workspace_id
            AND o.payload_json ? 'bugId'
            AND o.payload_json->>'bugId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`;

module.exports = {
  /** Exposed for the integration test; safe to run again (only fills empty links). */
  BACKFILL_SQL,
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'notifications',
        'bug_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE notifications
           ADD CONSTRAINT fk_notifications_bug_workspace FOREIGN KEY (workspace_id, bug_id)
             REFERENCES bugs(workspace_id, id) ON DELETE SET NULL (bug_id) ON UPDATE CASCADE;
         CREATE INDEX idx_notifications_bug_id ON notifications (bug_id) WHERE bug_id IS NOT NULL;`,
        { transaction },
      );
      await queryInterface.sequelize.query(BACKFILL_SQL, { transaction });
    });
  },

  async down(queryInterface) {
    // Local/disposable rollback; Production rollback only drops the link, notifications stay.
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_notifications_bug_id;
         ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_bug_workspace;`,
        { transaction },
      );
      await queryInterface.removeColumn('notifications', 'bug_id', { transaction });
    });
  },
};
