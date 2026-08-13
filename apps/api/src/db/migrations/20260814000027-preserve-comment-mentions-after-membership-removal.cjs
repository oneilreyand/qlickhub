'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Mention history belongs to the discussion record, not to the current membership.
      await sequelize.query(
        'ALTER TABLE task_comment_mentions DROP CONSTRAINT IF EXISTS fk_task_comment_mentions_user_workspace_member;',
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE task_comment_mentions
         ADD CONSTRAINT fk_task_comment_mentions_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE RESTRICT ON UPDATE CASCADE;`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        'ALTER TABLE task_comment_mentions DROP CONSTRAINT IF EXISTS fk_task_comment_mentions_user;',
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE task_comment_mentions
         ADD CONSTRAINT fk_task_comment_mentions_user_workspace_member
         FOREIGN KEY (workspace_id, user_id)
         REFERENCES workspace_members(workspace_id, user_id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );
    });
  },
};
