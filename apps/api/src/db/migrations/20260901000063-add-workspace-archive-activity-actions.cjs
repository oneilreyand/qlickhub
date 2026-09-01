'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE workspace_membership_activity
        DROP CONSTRAINT IF EXISTS ck_workspace_membership_activity_action,
        ADD CONSTRAINT ck_workspace_membership_activity_action
          CHECK (action IN ('member_removed', 'member_restored', 'member_role_updated', 'member_specialties_updated', 'workspace_archived', 'workspace_restored'));
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE workspace_membership_activity
        DROP CONSTRAINT IF EXISTS ck_workspace_membership_activity_action,
        ADD CONSTRAINT ck_workspace_membership_activity_action
          CHECK (action IN ('member_removed', 'member_restored', 'member_role_updated', 'member_specialties_updated'));
    `);
  },
};
