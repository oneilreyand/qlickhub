'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Create requirements table
      await queryInterface.createTable(
        'requirements',
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
          code: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          status: {
            type: Sequelize.STRING(50),
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
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE requirements
         ADD CONSTRAINT uk_requirements_workspace_code UNIQUE (workspace_id, code);`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE requirements
         ADD CONSTRAINT uk_requirements_workspace_id UNIQUE (workspace_id, id);`,
        { transaction }
      );

      // 2. Create task_requirements junction table
      await queryInterface.createTable(
        'task_requirements',
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
          task_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'tasks',
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
          linked_by: {
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
        },
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_requirements
         ADD CONSTRAINT uk_task_requirements_task_req UNIQUE (task_id, requirement_id);`,
        { transaction }
      );

      // Composite foreign keys to enforce task-requirement-workspace boundaries
      await sequelize.query(
        `ALTER TABLE task_requirements
         ADD CONSTRAINT fk_task_requirements_workspace_task
         FOREIGN KEY (workspace_id, task_id)
         REFERENCES tasks(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_requirements
         ADD CONSTRAINT fk_task_requirements_workspace_req
         FOREIGN KEY (workspace_id, requirement_id)
         REFERENCES requirements(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await queryInterface.addIndex('task_requirements', ['workspace_id', 'task_id'], {
        name: 'idx_task_requirements_task',
        transaction,
      });

      await queryInterface.addIndex('task_requirements', ['workspace_id', 'requirement_id'], {
        name: 'idx_task_requirements_req',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('task_requirements', { transaction });
      await queryInterface.dropTable('requirements', { transaction });
    });
  },
};
