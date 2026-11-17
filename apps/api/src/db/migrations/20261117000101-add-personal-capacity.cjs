'use strict';

/**
 * WORK-FOUNDATION P4 (ADR-044): one weekly capacity per person (in effort points) and time off.
 * Additive only: a Workspace default on `workspaces`, an optional per-user override, and time-off
 * date ranges without a reason (no personal data). Rows follow the user (ON DELETE CASCADE).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE workspaces
           ADD COLUMN IF NOT EXISTS default_weekly_capacity_points SMALLINT NOT NULL DEFAULT 15;`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE workspaces
           ADD CONSTRAINT workspaces_default_weekly_capacity_valid
           CHECK (default_weekly_capacity_points BETWEEN 1 AND 200);`,
        { transaction },
      );
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS user_capacities (
           user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
           weekly_points SMALLINT NOT NULL,
           updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT user_capacities_weekly_points_valid CHECK (weekly_points BETWEEN 1 AND 200)
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS user_time_off (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           start_date DATE NOT NULL,
           end_date DATE NOT NULL,
           created_by UUID REFERENCES users(id) ON DELETE SET NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT user_time_off_range_valid CHECK (end_date >= start_date)
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_user_time_off_user_range
           ON user_time_off (user_id, start_date, end_date);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP TABLE IF EXISTS user_time_off;', { transaction });
      await sequelize.query('DROP TABLE IF EXISTS user_capacities;', { transaction });
      await sequelize.query(
        `ALTER TABLE workspaces
           DROP CONSTRAINT IF EXISTS workspaces_default_weekly_capacity_valid,
           DROP COLUMN IF EXISTS default_weekly_capacity_points;`,
        { transaction },
      );
    });
  },
};
