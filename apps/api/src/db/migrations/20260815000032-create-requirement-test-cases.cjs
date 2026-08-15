'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'requirement_test_cases',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'workspaces',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          requirement_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'requirements',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          test_type: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'manual',
          },
          status: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'pending',
          },
          execution_details: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE requirement_test_cases
         ADD CONSTRAINT fk_req_test_cases_workspace_req
         FOREIGN KEY (workspace_id, requirement_id)
         REFERENCES requirements(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await queryInterface.addIndex('requirement_test_cases', ['workspace_id', 'requirement_id'], {
        name: 'idx_req_test_cases_req',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('requirement_test_cases', { transaction });
    });
  },
};
