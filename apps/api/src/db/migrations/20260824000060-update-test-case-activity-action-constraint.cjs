'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE test_case_activity
           DROP CONSTRAINT IF EXISTS ck_test_case_activity_action;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_activity
           ADD CONSTRAINT ck_test_case_activity_action CHECK (
             action IN (
               'test_case_created',
               'test_case_updated',
               'test_case_status_changed',
               'test_case_imported',
               'test_run_started',
               'test_result_recorded',
               'test_evidence_link_added'
             )
           );`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE test_case_activity
           DROP CONSTRAINT IF EXISTS ck_test_case_activity_action;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_activity
           ADD CONSTRAINT ck_test_case_activity_action CHECK (
             action IN ('test_case_created', 'test_run_started', 'test_result_recorded')
           );`,
        { transaction },
      );
    });
  },
};
