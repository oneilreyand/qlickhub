'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'qris_sandbox_transactions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_run_id: { type: Sequelize.UUID, allowNull: false },
          test_case_id: { type: Sequelize.UUID, allowNull: false },
          idempotency_key: { type: Sequelize.STRING(128), allowNull: false },
          amount_minor: { type: Sequelize.INTEGER, allowNull: false },
          currency: { type: Sequelize.STRING(3), allowNull: false },
          status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'pending' },
          created_by: { type: Sequelize.UUID, allowNull: false },
          simulated_at: { type: Sequelize.DATE, allowNull: true },
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
        `ALTER TABLE qris_sandbox_transactions
           ADD CONSTRAINT fk_qris_sandbox_transactions_workspace
             FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qris_sandbox_transactions_test_run
             FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qris_sandbox_transactions_test_case
             FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qris_sandbox_transactions_creator
             FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT uk_qris_sandbox_transactions_workspace_idempotency
             UNIQUE (workspace_id, idempotency_key),
           ADD CONSTRAINT ck_qris_sandbox_transactions_amount_nonfinancial
             CHECK (amount_minor = 0),
           ADD CONSTRAINT ck_qris_sandbox_transactions_currency
             CHECK (currency = 'IDR'),
           ADD CONSTRAINT ck_qris_sandbox_transactions_status
             CHECK (status IN ('pending', 'paid', 'failed', 'expired'));`,
        { transaction },
      );
      await queryInterface.addIndex('qris_sandbox_transactions', ['workspace_id', 'test_run_id'], {
        name: 'idx_qris_sandbox_transactions_workspace_run',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('qris_sandbox_transactions');
  },
};
