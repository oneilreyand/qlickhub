'use strict';

/**
 * P3b (AC-3.4): centang per langkah dan browser/perangkat disimpan bersama hasil uji.
 * Aditif dan nullable: hasil lama tidak berubah dan tetap valid.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE test_results
           ADD COLUMN IF NOT EXISTS step_results JSONB NULL,
           ADD COLUMN IF NOT EXISTS browser VARCHAR(100) NULL,
           ADD COLUMN IF NOT EXISTS device VARCHAR(100) NULL;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE test_results
           DROP COLUMN IF EXISTS step_results,
           DROP COLUMN IF EXISTS browser,
           DROP COLUMN IF EXISTS device;`,
        { transaction },
      );
    });
  },
};
