'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'notifications',
        'idempotency_key',
        { type: Sequelize.STRING(512), allowNull: true },
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX uq_notifications_idempotency_key ON notifications (idempotency_key) WHERE idempotency_key IS NOT NULL',
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS uq_notifications_idempotency_key',
        { transaction },
      );
      await queryInterface.removeColumn('notifications', 'idempotency_key', { transaction });
    });
  },
};
