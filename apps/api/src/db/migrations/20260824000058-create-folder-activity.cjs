'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS folder_activity (
           id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
           workspace_id UUID NOT NULL,
           folder_id UUID NOT NULL,
           actor_id UUID NULL,
           action VARCHAR(100) NOT NULL,
           metadata_json JSONB NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE folder_activity
         ADD CONSTRAINT fk_folder_activity_workspace
         FOREIGN KEY (workspace_id)
         REFERENCES workspaces(id)
         ON DELETE CASCADE;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE folder_activity
         ADD CONSTRAINT fk_folder_activity_folder_workspace
         FOREIGN KEY (folder_id, workspace_id)
         REFERENCES work_folders(id, workspace_id)
         ON DELETE CASCADE
         ON UPDATE CASCADE;`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_folder_activity_workspace_folder_created
         ON folder_activity (workspace_id, folder_id, created_at);`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_folder_activity_workspace_created
         ON folder_activity (workspace_id, created_at);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP TABLE IF EXISTS folder_activity;`, { transaction });
    });
  },
};
