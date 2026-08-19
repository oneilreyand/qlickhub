'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'owner';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'qa';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    await queryInterface.addColumn('users', 'onboarding_completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'onboarding_completed_at');
  },
};
