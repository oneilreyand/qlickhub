'use strict';

/**
 * MY-WORK-REPORT P4 (ADR-047): relations between two tasks, possibly in different Workspaces.
 * Separate from `task_links` (URL references). Rows follow either task (ON DELETE CASCADE).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS task_relations (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
           source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
           target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
           type VARCHAR(16) NOT NULL,
           created_by UUID REFERENCES users(id) ON DELETE SET NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT task_relations_type_valid CHECK (type IN ('blocks', 'relates_to', 'duplicates')),
           CONSTRAINT task_relations_not_self CHECK (source_task_id <> target_task_id),
           CONSTRAINT task_relations_unique UNIQUE (source_task_id, target_task_id, type)
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_relations_target ON task_relations (target_task_id);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS task_relations;');
  },
};
