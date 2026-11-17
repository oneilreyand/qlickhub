'use strict';

/**
 * WORK-FOUNDATION P2 (ADR-044): work calendar per Workspace.
 * Additive only: timezone + working days on `workspaces` (defaults Asia/Jakarta, Mon–Fri) and a
 * `workspace_holidays` table. Holidays follow the Workspace lifecycle (ON DELETE CASCADE, DATA-003).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE workspaces
           ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
           ADD COLUMN IF NOT EXISTS working_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}';`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE workspaces
           ADD CONSTRAINT workspaces_working_days_valid
           CHECK (
             cardinality(working_days) BETWEEN 1 AND 7
             AND working_days <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]
           );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS workspace_holidays (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
           holiday_date DATE NOT NULL,
           name VARCHAR(120) NOT NULL,
           created_by UUID REFERENCES users(id) ON DELETE SET NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT workspace_holidays_unique_date UNIQUE (workspace_id, holiday_date),
           CONSTRAINT workspace_holidays_name_not_blank CHECK (length(btrim(name)) > 0)
         );`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP TABLE IF EXISTS workspace_holidays;', { transaction });
      await sequelize.query(
        `ALTER TABLE workspaces
           DROP CONSTRAINT IF EXISTS workspaces_working_days_valid,
           DROP COLUMN IF EXISTS working_days,
           DROP COLUMN IF EXISTS timezone;`,
        { transaction },
      );
    });
  },
};
