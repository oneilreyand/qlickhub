'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Check if table exists (e.g. if an environment previously executed a drop)
      const tables = await queryInterface.showAllTables({ transaction });
      const tableExists = tables.includes('task_attachments');

      if (!tableExists) {
        // Safe recovery: Re-create the complete task_attachments table
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
            storage_provider: {
              type: Sequelize.STRING(24),
              allowNull: false,
              defaultValue: 'local',
            },
            provider_file_id: {
              type: Sequelize.STRING(512),
              allowNull: true,
            },
            category: {
              type: Sequelize.STRING(32),
              allowNull: false,
              defaultValue: 'general',
            },
            caption: {
              type: Sequelize.STRING(500),
              allowNull: true,
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

        // Add composite foreign key constraint
        await sequelize.query(
          `ALTER TABLE task_attachments
           ADD CONSTRAINT fk_task_attachments_workspace_task
           FOREIGN KEY (workspace_id, task_id)
           REFERENCES tasks(workspace_id, id)
           ON DELETE CASCADE ON UPDATE CASCADE;`,
          { transaction }
        );

        // Add indexes
        await queryInterface.addIndex('task_attachments', ['workspace_id', 'task_id'], {
          name: 'idx_task_attachments_workspace_task',
          transaction,
        });

        await queryInterface.addIndex('task_attachments', ['workspace_id', 'task_id', 'category'], {
          name: 'idx_task_attachments_task_category',
          transaction,
        });
      }
    });
  },

  async down(_queryInterface) {
    // Non-destructive: We preserve task_attachments and do NOT drop the table.
  },
};
