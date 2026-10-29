'use strict';

/**
 * P5a-1 (AC-5.1): Plan tersimpan. Tabel baru dan aditif; tidak ada data lama yang berubah.
 * Satu Feature paling banyak punya satu Plan (indeks unik pada feature_task_id).
 * Tahap Feature tidak disimpan di tasks; dihitung dari feature_plans.status.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS feature_plans (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           workspace_id UUID NOT NULL,
           feature_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
           idea_text TEXT NOT NULL,
           status VARCHAR(20) NOT NULL DEFAULT 'clarifying'
             CHECK (status IN ('clarifying', 'ready', 'applied')),
           created_by UUID NOT NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_plans_feature_task
           ON feature_plans (feature_task_id);`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_feature_plans_workspace
           ON feature_plans (workspace_id, status);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS feature_plans;');
  },
};
