'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'user_fcm_tokens',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          token: {
            type: Sequelize.STRING(1024),
            allowNull: false,
          },
          device_info: {
            type: Sequelize.STRING(255),
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
        },
        { transaction }
      );

      await queryInterface.addIndex('user_fcm_tokens', ['user_id'], {
        name: 'idx_user_fcm_tokens_user_id',
        transaction,
      });

      await queryInterface.addIndex('user_fcm_tokens', ['user_id', 'token'], {
        name: 'idx_user_fcm_tokens_user_token_unique',
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('user_fcm_tokens', { transaction });
    });
  },
};
