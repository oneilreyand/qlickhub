'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const [cols] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'bugs' AND column_name = 'environment';`,
        { transaction },
      );

      if (cols.length === 0) {
        await queryInterface.addColumn(
          'bugs',
          'environment',
          {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: 'staging',
          },
          { transaction },
        );
      }

      await sequelize.query(`ALTER TABLE bugs ALTER COLUMN test_result_id DROP NOT NULL;`, {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const [cols] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'bugs' AND column_name = 'environment';`,
        { transaction },
      );

      if (cols.length > 0) {
        await queryInterface.removeColumn('bugs', 'environment', { transaction });
      }

      await sequelize.query(`ALTER TABLE bugs ALTER COLUMN test_result_id SET NOT NULL;`, {
        transaction,
      });
    });
  },
};
