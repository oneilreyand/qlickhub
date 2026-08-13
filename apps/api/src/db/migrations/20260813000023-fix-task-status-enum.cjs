'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tasks_status') THEN
          ALTER TYPE "enum_tasks_status" ADD VALUE IF NOT EXISTS 'in_review';
          ALTER TYPE "enum_tasks_status" ADD VALUE IF NOT EXISTS 'canceled';
        END IF;
      END $$;
    `);
  },

  async down() {
    // No-op for Postgres ENUM value additions
  },
};
