'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'notification_outbox',
        'dead_lettered_at',
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE notification_outbox
           DROP CONSTRAINT ck_notification_outbox_status,
           ADD CONSTRAINT ck_notification_outbox_status
             CHECK (delivery_status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter'))`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE notification_outbox
           SET delivery_status = 'failed',
               next_attempt_at = CURRENT_TIMESTAMP
         WHERE delivery_status = 'dead_letter'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE notification_outbox
           DROP CONSTRAINT ck_notification_outbox_status,
           ADD CONSTRAINT ck_notification_outbox_status
             CHECK (delivery_status IN ('pending', 'processing', 'delivered', 'failed'))`,
        { transaction },
      );
      await queryInterface.removeColumn('notification_outbox', 'dead_lettered_at', { transaction });
    });
  },
};
