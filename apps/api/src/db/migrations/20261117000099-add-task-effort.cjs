'use strict';

/**
 * WORK-FOUNDATION P3 (ADR-044): nullable effort size on tasks (used by Subtasks only).
 * Existing rows stay NULL ("beban belum diukur"); nothing is backfilled (DATA-005).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `DO $$ BEGIN
           CREATE TYPE enum_tasks_effort AS ENUM ('xs', 's', 'm', 'l', 'xl');
         EXCEPTION WHEN duplicate_object THEN NULL;
         END $$;`,
        { transaction },
      );
      await sequelize.query(
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS effort enum_tasks_effort NULL;',
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('ALTER TABLE tasks DROP COLUMN IF EXISTS effort;', { transaction });
      await sequelize.query('DROP TYPE IF EXISTS enum_tasks_effort;', { transaction });
    });
  },
};
