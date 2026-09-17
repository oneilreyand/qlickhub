'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'qa_assurance_rollout_settings',
        {
          workspace_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
          mode: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'observe' },
          updated_by: { type: Sequelize.UUID, allowNull: true },
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
      await queryInterface.createTable(
        'qa_assurance_rollout_events',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          from_mode: { type: Sequelize.STRING(16), allowNull: false },
          to_mode: { type: Sequelize.STRING(16), allowNull: false },
          reason: { type: Sequelize.TEXT, allowNull: false },
          changed_by: { type: Sequelize.UUID, allowNull: false },
          changed_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE qa_assurance_rollout_settings
           ADD CONSTRAINT fk_qa_assurance_rollout_settings_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
           ADD CONSTRAINT fk_qa_assurance_rollout_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
           ADD CONSTRAINT ck_qa_assurance_rollout_settings_mode CHECK (mode IN ('observe', 'warn', 'enforce'));
         ALTER TABLE qa_assurance_rollout_events
           ADD CONSTRAINT fk_qa_assurance_rollout_events_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
           ADD CONSTRAINT fk_qa_assurance_rollout_events_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
           ADD CONSTRAINT ck_qa_assurance_rollout_events_from_mode CHECK (from_mode IN ('observe', 'warn', 'enforce')),
           ADD CONSTRAINT ck_qa_assurance_rollout_events_to_mode CHECK (to_mode IN ('observe', 'warn', 'enforce')),
           ADD CONSTRAINT ck_qa_assurance_rollout_events_reason CHECK (length(btrim(reason)) >= 10);`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO qa_assurance_rollout_settings (workspace_id, mode, created_at, updated_at)
         SELECT id, 'observe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM workspaces;`,
        { transaction },
      );
      await queryInterface.addIndex('qa_assurance_rollout_events', ['workspace_id', 'changed_at'], {
        name: 'idx_qa_assurance_rollout_events_workspace_changed',
        transaction,
      });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('qa_assurance_rollout_events', { transaction });
      await queryInterface.dropTable('qa_assurance_rollout_settings', { transaction });
    });
  },
};
