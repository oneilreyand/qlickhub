'use strict';

/**
 * P2c (AC-2.11): centang cek mandiri Developer per Acceptance Criterion disimpan di server,
 * per subtask. Tabel baru dan aditif; tidak ada data lama yang berubah.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS subtask_acceptance_checks (
           workspace_id UUID NOT NULL,
           task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
           acceptance_criterion_id UUID NOT NULL REFERENCES acceptance_criteria(id) ON DELETE CASCADE,
           checked_by UUID NOT NULL,
           checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (task_id, acceptance_criterion_id)
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_subtask_acceptance_checks_workspace
           ON subtask_acceptance_checks (workspace_id, task_id);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS subtask_acceptance_checks;');
  },
};
