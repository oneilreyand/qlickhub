'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'workspaces',
        'allow_qa_task_creation',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('workspaces', 'allow_qa_task_creation', { transaction });
    });
  },
};
