'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      if (tables.map((table) => String(table).replace('public.', '')).includes('users')) return;

      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', { transaction });

      await queryInterface.createTable('users', {
        id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
        email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
        password_hash: { type: Sequelize.STRING(255), allowNull: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        avatar_url: { type: Sequelize.STRING(255), allowNull: true },
        role: { type: Sequelize.ENUM('admin', 'qa_lead', 'qa_member', 'dev', 'po', 'viewer'), allowNull: false, defaultValue: 'qa_member' },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });

      await queryInterface.createTable('auth_sessions', {
        id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
        user_id: { type: Sequelize.UUID, allowNull: false },
        user_agent: { type: Sequelize.STRING(512), allowNull: true },
        ip_address: { type: Sequelize.INET, allowNull: true },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        revoked_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });
      await queryInterface.addConstraint('auth_sessions', {
        fields: ['user_id'], type: 'foreign key', name: 'fk_auth_sessions_user',
        references: { table: 'users', field: 'id' }, onDelete: 'CASCADE', transaction,
      });
      await queryInterface.addIndex('auth_sessions', ['user_id', 'revoked_at', 'expires_at'], {
        name: 'idx_auth_sessions_user_active', transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auth_sessions');
    await queryInterface.dropTable('users');
  },
};
