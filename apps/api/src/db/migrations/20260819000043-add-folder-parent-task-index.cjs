'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('tasks', {
      name: 'idx_tasks_workspace_folder_parent',
      fields: ['workspace_id', 'folder_id', 'parent_task_id'],
      concurrently: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('tasks', 'idx_tasks_workspace_folder_parent');
  },
};
