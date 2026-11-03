'use strict';

/** ADR-036 / P5g-1. Additive: legacy rows retain assigned, including unassigned legacy tasks. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'tasks',
        'assignment_mode',
        {
          type: Sequelize.STRING(16),
          allowNull: false,
          defaultValue: 'assigned',
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE tasks
        ADD CONSTRAINT tasks_assignment_mode_valid CHECK (assignment_mode IN ('assigned', 'open')),
        ADD CONSTRAINT tasks_open_subtask_unassigned CHECK
          (assignment_mode <> 'open' OR (parent_task_id IS NOT NULL AND assignee_id IS NULL));`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_tasks_open_claim_queue
        ON tasks (workspace_id, delivery_area, due_date, id)
        WHERE assignment_mode = 'open' AND assignee_id IS NULL AND parent_task_id IS NOT NULL
          AND deleted_at IS NULL AND status NOT IN ('done', 'canceled');`,
        { transaction },
      );
    });
  },
  async down(queryInterface) {
    // Local/disposable rollback only. Export mode assignments before any production rollback.
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('tasks', 'idx_tasks_open_claim_queue', { transaction });
      await queryInterface.removeColumn('tasks', 'assignment_mode', { transaction });
    });
  },
};
