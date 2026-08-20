'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('task_attachments', { cascade: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('task_attachments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      workspace_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'workspaces',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tasks',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      uploader_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      storage_key: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },
};
