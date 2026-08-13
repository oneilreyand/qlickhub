'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      const tableNames = tables.map((t) => String(t).replace('public.', ''));

      if (!tableNames.includes('workspaces')) {
        await queryInterface.createTable('workspaces', {
          id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
          name: { type: Sequelize.STRING(100), allowNull: false },
          slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
          description: { type: Sequelize.TEXT, allowNull: true },
          owner_id: { type: Sequelize.UUID, allowNull: false },
          archived_at: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        }, { transaction });

        await queryInterface.addConstraint('workspaces', {
          fields: ['owner_id'],
          type: 'foreign key',
          name: 'fk_workspaces_owner',
          references: { table: 'users', field: 'id' },
          onDelete: 'RESTRICT',
          transaction,
        });

        await queryInterface.addIndex('workspaces', ['slug'], {
          name: 'idx_workspaces_slug',
          unique: true,
          transaction,
        });
      }

      if (!tableNames.includes('workspace_members')) {
        await queryInterface.createTable('workspace_members', {
          id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          user_id: { type: Sequelize.UUID, allowNull: false },
          role: { type: Sequelize.ENUM('owner', 'admin', 'po', 'dev', 'qa'), allowNull: false, defaultValue: 'dev' },
          joined_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        }, { transaction });

        await queryInterface.addConstraint('workspace_members', {
          fields: ['workspace_id'],
          type: 'foreign key',
          name: 'fk_workspace_members_workspace',
          references: { table: 'workspaces', field: 'id' },
          onDelete: 'CASCADE',
          transaction,
        });

        await queryInterface.addConstraint('workspace_members', {
          fields: ['user_id'],
          type: 'foreign key',
          name: 'fk_workspace_members_user',
          references: { table: 'users', field: 'id' },
          onDelete: 'CASCADE',
          transaction,
        });

        await queryInterface.addIndex('workspace_members', ['workspace_id', 'user_id'], {
          name: 'idx_workspace_members_workspace_user',
          unique: true,
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('workspace_members');
    await queryInterface.dropTable('workspaces');
  },
};
