'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      // Check if index already exists before adding
      const [results] = await sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname = 'idx_tasks_workspace_assignee';`,
        { transaction }
      );

      if (results.length === 0) {
        await queryInterface.addIndex('tasks', ['workspace_id', 'assignee_id'], {
          name: 'idx_tasks_workspace_assignee',
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const [results] = await sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname = 'idx_tasks_workspace_assignee';`,
        { transaction }
      );

      if (results.length > 0) {
        await queryInterface.removeIndex('tasks', 'idx_tasks_workspace_assignee', {
          transaction,
        });
      }
    });
  },
};
