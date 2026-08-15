'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('task_attachments', 'storage_provider', {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'local',
      }, { transaction });
      await queryInterface.addColumn('task_attachments', 'provider_file_id', {
        type: Sequelize.STRING(512),
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('task_attachments', 'category', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'general',
      }, { transaction });
      await queryInterface.addColumn('task_attachments', 'caption', {
        type: Sequelize.STRING(500),
        allowNull: true,
      }, { transaction });
      await queryInterface.addIndex('task_attachments', ['workspace_id', 'task_id', 'category'], {
        name: 'idx_task_attachments_task_category',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('task_attachments', 'idx_task_attachments_task_category', { transaction });
      await queryInterface.removeColumn('task_attachments', 'caption', { transaction });
      await queryInterface.removeColumn('task_attachments', 'category', { transaction });
      await queryInterface.removeColumn('task_attachments', 'provider_file_id', { transaction });
      await queryInterface.removeColumn('task_attachments', 'storage_provider', { transaction });
    });
  },
};
