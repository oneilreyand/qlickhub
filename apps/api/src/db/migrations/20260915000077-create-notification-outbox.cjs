'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'notification_outbox',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          task_id: { type: Sequelize.UUID, allowNull: true },
          actor_id: { type: Sequelize.UUID, allowNull: true },
          recipient_user_id: { type: Sequelize.UUID, allowNull: false },
          event_key: { type: Sequelize.STRING(255), allowNull: false },
          notification_type: { type: Sequelize.STRING(32), allowNull: false },
          title: { type: Sequelize.STRING(255), allowNull: false },
          message: { type: Sequelize.TEXT, allowNull: false },
          payload_json: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
          delivery_status: {
            type: Sequelize.STRING(16),
            allowNull: false,
            defaultValue: 'pending',
          },
          attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          next_attempt_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          delivered_at: { type: Sequelize.DATE, allowNull: true },
          last_error: { type: Sequelize.TEXT, allowNull: true },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE notification_outbox
           ADD CONSTRAINT fk_notification_outbox_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
           ADD CONSTRAINT fk_notification_outbox_task_workspace FOREIGN KEY (task_id, workspace_id) REFERENCES tasks(id, workspace_id) ON DELETE SET NULL (task_id) ON UPDATE CASCADE,
           ADD CONSTRAINT fk_notification_outbox_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
           ADD CONSTRAINT fk_notification_outbox_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
           ADD CONSTRAINT ck_notification_outbox_status CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
           ADD CONSTRAINT ck_notification_outbox_attempts CHECK (attempts >= 0),
           ADD CONSTRAINT uq_notification_outbox_event_recipient UNIQUE (event_key, recipient_user_id);`,
        { transaction },
      );
      await queryInterface.addIndex(
        'notification_outbox',
        ['delivery_status', 'next_attempt_at', 'created_at'],
        { name: 'idx_notification_outbox_dispatch', transaction },
      );
      await queryInterface.addIndex(
        'notification_outbox',
        ['workspace_id', 'task_id', 'created_at'],
        { name: 'idx_notification_outbox_task', transaction },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('notification_outbox');
  },
};
