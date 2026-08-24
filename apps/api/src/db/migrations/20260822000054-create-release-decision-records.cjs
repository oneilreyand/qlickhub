'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'qa_sign_offs',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          decision: { type: Sequelize.STRING(32), allowNull: false },
          notes: { type: Sequelize.TEXT, allowNull: true },
          readiness_snapshot_json: { type: Sequelize.JSONB, allowNull: false },
          signed_by: { type: Sequelize.UUID, allowNull: false },
          signed_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE qa_sign_offs
         ADD CONSTRAINT uk_qa_sign_offs_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT fk_qa_sign_offs_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_qa_sign_offs_feature_task FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_qa_sign_offs_signer_membership FOREIGN KEY (workspace_id, signed_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_qa_sign_offs_decision CHECK (decision IN ('approved', 'rejected')),
         ADD CONSTRAINT ck_qa_sign_offs_notes_not_blank CHECK (notes IS NULL OR length(btrim(notes)) > 0),
         ADD CONSTRAINT ck_qa_sign_offs_snapshot_object CHECK (jsonb_typeof(readiness_snapshot_json) = 'object');`,
        { transaction },
      );

      await queryInterface.createTable(
        'release_decisions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          qa_sign_off_id: { type: Sequelize.UUID, allowNull: false },
          decision: { type: Sequelize.STRING(32), allowNull: false },
          notes: { type: Sequelize.TEXT, allowNull: true },
          override_reason: { type: Sequelize.TEXT, allowNull: true },
          readiness_snapshot_json: { type: Sequelize.JSONB, allowNull: false },
          decided_by: { type: Sequelize.UUID, allowNull: false },
          decided_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE release_decisions
         ADD CONSTRAINT uk_release_decisions_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT fk_release_decisions_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_release_decisions_feature_task FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_release_decisions_qa_sign_off FOREIGN KEY (workspace_id, qa_sign_off_id)
           REFERENCES qa_sign_offs(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_release_decisions_decider_membership FOREIGN KEY (workspace_id, decided_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_release_decisions_decision CHECK (decision IN ('approved', 'rejected')),
         ADD CONSTRAINT ck_release_decisions_notes_not_blank CHECK (notes IS NULL OR length(btrim(notes)) > 0),
         ADD CONSTRAINT ck_release_decisions_override_not_blank CHECK (override_reason IS NULL OR length(btrim(override_reason)) > 0),
         ADD CONSTRAINT ck_release_decisions_override_scope CHECK (decision = 'approved' OR override_reason IS NULL),
         ADD CONSTRAINT ck_release_decisions_snapshot_object CHECK (jsonb_typeof(readiness_snapshot_json) = 'object');`,
        { transaction },
      );

      await queryInterface.addIndex(
        'qa_sign_offs',
        ['workspace_id', 'feature_task_id', 'signed_at'],
        {
          name: 'idx_qa_sign_offs_feature_signed',
          transaction,
        },
      );
      await queryInterface.addIndex(
        'release_decisions',
        ['workspace_id', 'feature_task_id', 'decided_at'],
        {
          name: 'idx_release_decisions_feature_decided',
          transaction,
        },
      );
      await queryInterface.addIndex('release_decisions', ['workspace_id', 'qa_sign_off_id'], {
        name: 'idx_release_decisions_sign_off',
        transaction,
      });

      await sequelize.query(
        `CREATE FUNCTION prevent_release_record_update()
         RETURNS trigger AS $$
         BEGIN
           RAISE EXCEPTION 'Release assurance records are append-only and cannot be updated';
         END;
         $$ LANGUAGE plpgsql;
         CREATE TRIGGER trg_qa_sign_offs_immutable
           BEFORE UPDATE ON qa_sign_offs
           FOR EACH ROW EXECUTE FUNCTION prevent_release_record_update();
         CREATE TRIGGER trg_release_decisions_immutable
           BEFORE UPDATE ON release_decisions
           FOR EACH ROW EXECUTE FUNCTION prevent_release_record_update();`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('release_decisions', { transaction });
      await queryInterface.dropTable('qa_sign_offs', { transaction });
      await sequelize.query('DROP FUNCTION IF EXISTS prevent_release_record_update();', {
        transaction,
      });
    });
  },
};
