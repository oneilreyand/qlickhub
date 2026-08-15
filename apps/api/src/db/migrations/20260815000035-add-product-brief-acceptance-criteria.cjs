'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('qa_document_versions', 'acceptance_criteria', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'[]'::jsonb"),
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('qa_document_versions', 'acceptance_criteria');
  },
};
