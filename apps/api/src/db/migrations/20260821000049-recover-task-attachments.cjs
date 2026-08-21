'use strict';

const TABLE_NAME = 'task_attachments';

function attachmentColumns(Sequelize) {
  return {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    workspace_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'workspaces', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    task_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'tasks', key: 'id' },
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
      references: { model: 'users', key: 'id' },
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
  };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      const tableNames = tables.map((table) =>
        typeof table === 'string' ? table : table.tableName
      );
      const definitions = attachmentColumns(Sequelize);

      if (!tableNames.includes(TABLE_NAME)) {
        await queryInterface.createTable(TABLE_NAME, definitions, { transaction });
      } else {
        const currentColumns = await queryInterface.describeTable(TABLE_NAME, {
          transaction,
        });

        for (const [columnName, definition] of Object.entries(definitions)) {
          if (!currentColumns[columnName]) {
            await queryInterface.addColumn(TABLE_NAME, columnName, definition, {
              transaction,
            });
          }
        }
      }

      await sequelize.query(
        `DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1
             FROM pg_constraint
             WHERE conname = 'fk_task_attachments_workspace_task'
               AND conrelid = 'task_attachments'::regclass
           ) THEN
             ALTER TABLE task_attachments
             ADD CONSTRAINT fk_task_attachments_workspace_task
             FOREIGN KEY (workspace_id, task_id)
             REFERENCES tasks(workspace_id, id)
             ON DELETE CASCADE ON UPDATE CASCADE;
           END IF;
         END
         $$;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_attachments_workspace_task
         ON task_attachments (workspace_id, task_id);`,
        { transaction }
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_attachments_task_category
         ON task_attachments (workspace_id, task_id, category);`,
        { transaction }
      );
    });
  },

  async down() {
    // Recovery is intentionally irreversible so rollback cannot delete evidence.
  },
};
