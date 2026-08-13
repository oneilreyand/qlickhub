'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      // 1. Add unique constraint on (id, workspace_id) to support composite FK
      await sequelize.query(
        `ALTER TABLE work_folders ADD CONSTRAINT uq_work_folders_id_workspace UNIQUE (id, workspace_id);`,
        { transaction }
      );

      // 2. Drop old fk_work_folders_parent FK (which was CASCADE)
      await sequelize.query(
        `ALTER TABLE work_folders DROP CONSTRAINT IF EXISTS fk_work_folders_parent;`,
        { transaction }
      );

      // 3. Add composite FK (parent_folder_id, workspace_id) -> work_folders(id, workspace_id) with ON DELETE RESTRICT
      await sequelize.query(
        `ALTER TABLE work_folders 
         ADD CONSTRAINT fk_work_folders_parent_workspace 
         FOREIGN KEY (parent_folder_id, workspace_id) 
         REFERENCES work_folders(id, workspace_id) 
         ON DELETE RESTRICT 
         ON UPDATE CASCADE;`,
        { transaction }
      );

      // 4. Create unique indexes for active sibling position ordering (Top-level & Subfolder)
      await sequelize.query(
        `CREATE UNIQUE INDEX uq_work_folders_top_level_pos 
         ON work_folders (workspace_id, position) 
         WHERE parent_folder_id IS NULL AND archived_at IS NULL;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE UNIQUE INDEX uq_work_folders_subfolder_pos 
         ON work_folders (workspace_id, parent_folder_id, position) 
         WHERE parent_folder_id IS NOT NULL AND archived_at IS NULL;`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP INDEX IF EXISTS uq_work_folders_subfolder_pos;`, { transaction });
      await sequelize.query(`DROP INDEX IF EXISTS uq_work_folders_top_level_pos;`, { transaction });
      await sequelize.query(`ALTER TABLE work_folders DROP CONSTRAINT IF EXISTS fk_work_folders_parent_workspace;`, { transaction });
      await sequelize.query(
        `ALTER TABLE work_folders 
         ADD CONSTRAINT fk_work_folders_parent 
         FOREIGN KEY (parent_folder_id) 
         REFERENCES work_folders(id) 
         ON DELETE CASCADE;`,
        { transaction }
      );
      await sequelize.query(`ALTER TABLE work_folders DROP CONSTRAINT IF EXISTS uq_work_folders_id_workspace;`, { transaction });
    });
  },
};
