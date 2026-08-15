'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'task_attachments',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
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
            onUpdate: 'CASCADE',
          },
          task_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'tasks',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          file_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          file_size: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          mime_type: {
            type: Sequelize.STRING(127),
            allowNull: false,
          },
          storage_ref: {
            type: Sequelize.STRING(512),
            allowNull: false,
          },
          uploader_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
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
        { transaction }
      );

      // Composite foreign key to enforce task-workspace boundary
      await sequelize.query(
        `ALTER TABLE task_attachments
         ADD CONSTRAINT fk_task_attachments_workspace_task
         FOREIGN KEY (workspace_id, task_id)
         REFERENCES tasks(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await queryInterface.addIndex('task_attachments', ['workspace_id', 'task_id'], {
        name: 'idx_task_attachments_workspace_task',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('task_attachments', { transaction });
    });
  },
};
