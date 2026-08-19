'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // 1. Add 'changes_requested' to enum_tasks_status
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tasks_status') THEN
          ALTER TYPE "enum_tasks_status" ADD VALUE IF NOT EXISTS 'changes_requested';
        END IF;
      END $$;
    `);

    // 2. Add reviewed_by and review_notes columns to tasks
    await queryInterface.addColumn('tasks', 'reviewed_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('tasks', 'review_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tasks', 'review_notes');
    await queryInterface.removeColumn('tasks', 'reviewed_by');
  },
};
