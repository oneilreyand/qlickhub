'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add url column to requirements table
    const reqTable = await queryInterface.describeTable('requirements');
    if (!reqTable.url) {
      await queryInterface.addColumn('requirements', 'url', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // 2. Make status nullable in qa_documents if not already
    const docTable = await queryInterface.describeTable('qa_documents');
    if (docTable.status) {
      await queryInterface.changeColumn('qa_documents', 'status', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const reqTable = await queryInterface.describeTable('requirements');
    if (reqTable.url) {
      await queryInterface.removeColumn('requirements', 'url');
    }
  },
};
