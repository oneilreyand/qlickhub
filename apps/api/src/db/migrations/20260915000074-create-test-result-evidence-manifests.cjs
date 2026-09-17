'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'test_result_evidence_manifests',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_result_id: { type: Sequelize.UUID, allowNull: false },
          sequence: { type: Sequelize.INTEGER, allowNull: false },
          kind: { type: Sequelize.STRING(16), allowNull: false },
          reason: { type: Sequelize.TEXT, allowNull: true },
          item_count: { type: Sequelize.INTEGER, allowNull: false },
          image_count: { type: Sequelize.INTEGER, allowNull: false },
          video_count: { type: Sequelize.INTEGER, allowNull: false },
          ready_count: { type: Sequelize.INTEGER, allowNull: false },
          evidence_snapshot: { type: Sequelize.JSONB, allowNull: false },
          sealed_by: { type: Sequelize.UUID, allowNull: false },
          sealed_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_result_evidence_manifests
           ADD CONSTRAINT fk_test_result_evidence_manifests_workspace
             FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_result_evidence_manifests_result
             FOREIGN KEY (test_result_id) REFERENCES test_results(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_result_evidence_manifests_sealed_by
             FOREIGN KEY (sealed_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_test_result_evidence_manifest_kind
             CHECK (kind IN ('initial', 'supplement')),
           ADD CONSTRAINT ck_test_result_evidence_manifest_sequence CHECK (sequence > 0),
           ADD CONSTRAINT ck_test_result_evidence_manifest_reason
             CHECK ((kind = 'initial' AND reason IS NULL) OR (kind = 'supplement' AND length(btrim(reason)) > 0)),
           ADD CONSTRAINT ck_test_result_evidence_manifest_counts
             CHECK (item_count >= 0 AND image_count >= 0 AND video_count >= 0 AND ready_count >= 0
               AND image_count + video_count <= item_count AND ready_count <= item_count),
           ADD CONSTRAINT uk_test_result_evidence_manifests_result_sequence
             UNIQUE (test_result_id, sequence);`,
        { transaction },
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX idx_test_result_evidence_manifests_initial
           ON test_result_evidence_manifests (test_result_id) WHERE kind = 'initial';
         CREATE INDEX idx_test_result_evidence_manifests_result_sequence
           ON test_result_evidence_manifests (workspace_id, test_result_id, sequence);`,
        { transaction },
      );

      // An evidence manifest is a sealed statement. Supplements are new rows,
      // never mutations of a previously sealed row. Deletion remains governed
      // by the parent Result's retention/lifecycle policy and FK cascade.
      await sequelize.query(
        `CREATE FUNCTION prevent_test_result_evidence_manifest_update()
         RETURNS trigger AS $$
         BEGIN
           RAISE EXCEPTION 'Test Result Evidence Manifest is immutable; create a supplement instead.'
             USING ERRCODE = '55000';
         END;
         $$ LANGUAGE plpgsql;
         CREATE TRIGGER trg_test_result_evidence_manifest_immutable
           BEFORE UPDATE ON test_result_evidence_manifests
           FOR EACH ROW EXECUTE FUNCTION prevent_test_result_evidence_manifest_update();`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `DROP TRIGGER IF EXISTS trg_test_result_evidence_manifest_immutable
           ON test_result_evidence_manifests;
         DROP FUNCTION IF EXISTS prevent_test_result_evidence_manifest_update();`,
        { transaction },
      );
      await queryInterface.dropTable('test_result_evidence_manifests', { transaction });
    });
  },
};
