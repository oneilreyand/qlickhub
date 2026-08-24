'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'acceptance_criteria',
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
          sequence: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          text: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: 'active',
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
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE acceptance_criteria
         ADD CONSTRAINT uk_acceptance_criteria_workspace_id UNIQUE (workspace_id, id);`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE acceptance_criteria
         ADD CONSTRAINT uk_acceptance_criteria_requirement_sequence
         UNIQUE (workspace_id, requirement_id, sequence);`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE acceptance_criteria
         ADD CONSTRAINT fk_acceptance_criteria_workspace_requirement
         FOREIGN KEY (workspace_id, requirement_id)
         REFERENCES requirements(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE acceptance_criteria
         ADD CONSTRAINT ck_acceptance_criteria_sequence_positive
         CHECK (sequence > 0);`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE acceptance_criteria
         ADD CONSTRAINT ck_acceptance_criteria_text_not_blank
         CHECK (length(btrim(text)) > 0);`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE acceptance_criteria
         ADD CONSTRAINT ck_acceptance_criteria_status
         CHECK (status IN ('active', 'deprecated'));`,
        { transaction },
      );

      await queryInterface.addIndex(
        'acceptance_criteria',
        ['workspace_id', 'requirement_id', 'sequence'],
        {
          name: 'idx_acceptance_criteria_requirement_sequence',
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('acceptance_criteria');
  },
};
