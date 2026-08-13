'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      const tableNames = tables.map((t) => String(t).replace('public.', ''));

      if (!tableNames.includes('work_folders')) {
        await queryInterface.createTable('work_folders', {
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
          parent_folder_id: {
            type: Sequelize.UUID,
            allowNull: true,
          },
          name: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          position: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          archived_at: {
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
        }, { transaction });

        // Foreign keys
        await queryInterface.addConstraint('work_folders', {
          fields: ['workspace_id'],
          type: 'foreign key',
          name: 'fk_work_folders_workspace',
          references: { table: 'workspaces', field: 'id' },
          onDelete: 'CASCADE',
          transaction,
        });

        await queryInterface.addConstraint('work_folders', {
          fields: ['parent_folder_id'],
          type: 'foreign key',
          name: 'fk_work_folders_parent',
          references: { table: 'work_folders', field: 'id' },
          onDelete: 'CASCADE',
          transaction,
        });

        await queryInterface.addConstraint('work_folders', {
          fields: ['created_by'],
          type: 'foreign key',
          name: 'fk_work_folders_creator',
          references: { table: 'users', field: 'id' },
          onDelete: 'RESTRICT',
          transaction,
        });

        // Indexes for hierarchy & position ordering
        await queryInterface.addIndex('work_folders', ['workspace_id'], {
          name: 'idx_work_folders_workspace',
          transaction,
        });

        await queryInterface.addIndex('work_folders', ['parent_folder_id'], {
          name: 'idx_work_folders_parent',
          transaction,
        });

        await queryInterface.addIndex('work_folders', ['workspace_id', 'parent_folder_id', 'position'], {
          name: 'idx_work_folders_workspace_parent_pos',
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('work_folders');
  },
};
