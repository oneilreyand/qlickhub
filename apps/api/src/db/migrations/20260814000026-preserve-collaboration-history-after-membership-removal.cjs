'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Membership removal must not erase or block the visible audit/discussion history.
      await sequelize.query(
        'ALTER TABLE task_activity DROP CONSTRAINT IF EXISTS fk_task_activity_actor_workspace_member;',
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE task_activity
         ADD CONSTRAINT fk_task_activity_actor
         FOREIGN KEY (actor_id) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        'ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS fk_task_comments_author_workspace_member;',
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT fk_task_comments_author
         FOREIGN KEY (author_id) REFERENCES users(id)
         ON DELETE RESTRICT ON UPDATE CASCADE;`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query('ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS fk_task_comments_author;', { transaction });
      await sequelize.query(
        `ALTER TABLE task_comments
         ADD CONSTRAINT fk_task_comments_author_workspace_member
         FOREIGN KEY (workspace_id, author_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE RESTRICT ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query('ALTER TABLE task_activity DROP CONSTRAINT IF EXISTS fk_task_activity_actor;', { transaction });
      await sequelize.query(
        `ALTER TABLE task_activity
         ADD CONSTRAINT fk_task_activity_actor_workspace_member
         FOREIGN KEY (workspace_id, actor_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE SET NULL ON UPDATE CASCADE;`,
        { transaction }
      );
    });
  },
};
