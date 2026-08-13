'use strict';

function firstRow(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      const [invalidFolderTasks] = await sequelize.query(
        `SELECT t.id
         FROM tasks t
         INNER JOIN work_folders f ON f.id = t.folder_id
         WHERE t.folder_id IS NOT NULL
           AND t.workspace_id <> f.workspace_id
         LIMIT 1;`,
        { transaction }
      );

      if (firstRow(invalidFolderTasks)) {
        throw new Error(
          'Cannot enforce task folder workspace integrity: at least one task references a folder in another workspace. Repair the data before retrying this migration.'
        );
      }

      const [invalidAssignees] = await sequelize.query(
        `SELECT t.id
         FROM tasks t
         WHERE t.assignee_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
             FROM workspace_members wm
             WHERE wm.workspace_id = t.workspace_id
               AND wm.user_id = t.assignee_id
           )
         LIMIT 1;`,
        { transaction }
      );

      if (firstRow(invalidAssignees)) {
        throw new Error(
          'Cannot enforce task assignee membership integrity: at least one assignee is not a member of the task workspace. Repair the data before retrying this migration.'
        );
      }

      const [missingOwnerMemberships] = await sequelize.query(
        `SELECT w.id
         FROM workspaces w
         WHERE NOT EXISTS (
           SELECT 1
           FROM workspace_members wm
           WHERE wm.workspace_id = w.id
             AND wm.user_id = w.owner_id
             AND wm.role = 'owner'
         )
         LIMIT 1;`,
        { transaction }
      );

      if (firstRow(missingOwnerMemberships)) {
        throw new Error(
          'Cannot enforce workspace owner integrity: every workspace owner must have one owner membership. Repair the data before retrying this migration.'
        );
      }

      const [duplicateOwners] = await sequelize.query(
        `SELECT workspace_id
         FROM workspace_members
         WHERE role = 'owner'
         GROUP BY workspace_id
         HAVING COUNT(*) > 1
         LIMIT 1;`,
        { transaction }
      );

      if (firstRow(duplicateOwners)) {
        throw new Error(
          'Cannot enforce workspace owner integrity: at least one workspace has multiple owner memberships. Repair the data before retrying this migration.'
        );
      }

      await sequelize.query('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_folder;', { transaction });
      await sequelize.query(
        `ALTER TABLE tasks
         ADD CONSTRAINT fk_tasks_folder_workspace
         FOREIGN KEY (folder_id, workspace_id)
         REFERENCES work_folders(id, workspace_id)
         ON DELETE RESTRICT
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE tasks
         ADD CONSTRAINT fk_tasks_assignee_workspace_member
         FOREIGN KEY (workspace_id, assignee_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE SET NULL (assignee_id)
         ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `CREATE UNIQUE INDEX uq_workspace_members_single_owner
         ON workspace_members (workspace_id)
         WHERE role = 'owner';`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS uq_workspace_members_single_owner;', { transaction });
      await sequelize.query('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_assignee_workspace_member;', { transaction });
      await sequelize.query('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_folder_workspace;', { transaction });
      await sequelize.query(
        `ALTER TABLE tasks
         ADD CONSTRAINT fk_tasks_folder
         FOREIGN KEY (folder_id)
         REFERENCES work_folders(id)
         ON DELETE RESTRICT;`,
        { transaction }
      );
    });
  },
};
