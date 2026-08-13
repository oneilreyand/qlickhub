'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      const tableNames = tables.map((t) => String(t).replace('public.', ''));

      if (!tableNames.includes('tasks')) {
        await queryInterface.createTable('tasks', {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.literal('uuid_generate_v4()'),
            primaryKey: true,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          folder_id: {
            type: Sequelize.UUID,
            allowNull: true,
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
            type: Sequelize.ENUM('todo', 'in_progress', 'in_review', 'done', 'canceled'),
            allowNull: false,
            defaultValue: 'todo',
          },
          priority: {
            type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
            allowNull: false,
            defaultValue: 'medium',
          },
          assignee_id: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          reporter_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          start_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          due_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          completed_at: {
            type: Sequelize.DATE,
            allowNull: true,
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
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        }, { transaction });

        // Foreign keys
        await queryInterface.addConstraint('tasks', {
          fields: ['workspace_id'],
          type: 'foreign key',
          name: 'fk_tasks_workspace',
          references: { table: 'workspaces', field: 'id' },
          onDelete: 'CASCADE',
          transaction,
        });

        await queryInterface.addConstraint('tasks', {
          fields: ['folder_id'],
          type: 'foreign key',
          name: 'fk_tasks_folder',
          references: { table: 'work_folders', field: 'id' },
          onDelete: 'RESTRICT',
          transaction,
        });

        await queryInterface.addConstraint('tasks', {
          fields: ['reporter_id'],
          type: 'foreign key',
          name: 'fk_tasks_reporter',
          references: { table: 'users', field: 'id' },
          onDelete: 'RESTRICT',
          transaction,
        });

        await queryInterface.addConstraint('tasks', {
          fields: ['assignee_id'],
          type: 'foreign key',
          name: 'fk_tasks_assignee',
          references: { table: 'users', field: 'id' },
          onDelete: 'SET NULL',
          transaction,
        });

        // Indexes for performance & date queries
        await queryInterface.addIndex('tasks', ['workspace_id'], {
          name: 'idx_tasks_workspace',
          transaction,
        });

        await queryInterface.addIndex('tasks', ['folder_id'], {
          name: 'idx_tasks_folder',
          transaction,
        });

        await queryInterface.addIndex('tasks', ['workspace_id', 'status', 'priority'], {
          name: 'idx_tasks_workspace_status_priority',
          transaction,
        });

        await queryInterface.addIndex('tasks', ['workspace_id', 'due_date', 'start_date'], {
          name: 'idx_tasks_workspace_dates',
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
  },
};
