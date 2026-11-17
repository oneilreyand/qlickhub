'use strict';

/**
 * WORK-FOUNDATION P5 (ADR-045): blockers recorded on a task with a person in charge (PIC).
 * Separate from task status so the status flow, QA gates and release gates stay unchanged.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS task_blockers (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
           task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
           category VARCHAR(32) NOT NULL,
           description TEXT NOT NULL,
           pic_user_id UUID NOT NULL REFERENCES users(id),
           opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
           opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
           resolved_at TIMESTAMPTZ,
           resolution_note TEXT,
           CONSTRAINT task_blockers_category_valid CHECK (category IN
             ('clarification', 'dependency', 'review', 'environment', 'access', 'external', 'other')),
           CONSTRAINT task_blockers_description_not_blank CHECK (length(btrim(description)) > 0)
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_blockers_task ON task_blockers (task_id, opened_at DESC);`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_blockers_workspace_open
           ON task_blockers (workspace_id, opened_at) WHERE resolved_at IS NULL;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS task_blockers;');
  },
};
