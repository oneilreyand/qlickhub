'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const [results] = await sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname = 'idx_tasks_assignee_status_schedule';`,
        { transaction },
      );

      if (results.length === 0) {
        await queryInterface.addIndex('tasks', ['assignee_id', 'status', 'start_date', 'due_date'], {
          name: 'idx_tasks_assignee_status_schedule',
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const [results] = await sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname = 'idx_tasks_assignee_status_schedule';`,
        { transaction },
      );

      if (results.length > 0) {
        await queryInterface.removeIndex('tasks', 'idx_tasks_assignee_status_schedule', {
          transaction,
        });
      }
    });
  },
};
