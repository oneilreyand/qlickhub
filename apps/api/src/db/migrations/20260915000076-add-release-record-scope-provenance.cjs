'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'qa_sign_offs',
        'qa_subtask_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'qa_sign_offs',
        'test_cycle_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'qa_sign_offs',
        'readiness_baseline_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'qa_sign_offs',
        'candidate_fingerprint',
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'release_decisions',
        'test_cycle_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'release_decisions',
        'readiness_baseline_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'release_decisions',
        'candidate_fingerprint',
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE qa_sign_offs
           ADD CONSTRAINT fk_qa_sign_offs_qa_subtask
             FOREIGN KEY (qa_subtask_id, workspace_id) REFERENCES tasks(id, workspace_id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qa_sign_offs_test_cycle
             FOREIGN KEY (test_cycle_id, workspace_id) REFERENCES qa_test_cycles(id, workspace_id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qa_sign_offs_readiness_baseline
             FOREIGN KEY (readiness_baseline_id, workspace_id) REFERENCES feature_readiness_baselines(id, workspace_id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_qa_sign_offs_candidate_fingerprint
             CHECK (candidate_fingerprint IS NULL OR length(btrim(candidate_fingerprint)) BETWEEN 1 AND 255);
         ALTER TABLE release_decisions
           ADD CONSTRAINT fk_release_decisions_test_cycle
             FOREIGN KEY (test_cycle_id, workspace_id) REFERENCES qa_test_cycles(id, workspace_id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_release_decisions_readiness_baseline
             FOREIGN KEY (readiness_baseline_id, workspace_id) REFERENCES feature_readiness_baselines(id, workspace_id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_release_decisions_candidate_fingerprint
             CHECK (candidate_fingerprint IS NULL OR length(btrim(candidate_fingerprint)) BETWEEN 1 AND 255);`,
        { transaction },
      );
      await queryInterface.addIndex(
        'qa_sign_offs',
        ['workspace_id', 'feature_task_id', 'test_cycle_id', 'signed_at'],
        { name: 'idx_qa_sign_offs_feature_cycle_signed', transaction },
      );
      await queryInterface.addIndex(
        'release_decisions',
        ['workspace_id', 'feature_task_id', 'test_cycle_id', 'decided_at'],
        { name: 'idx_release_decisions_feature_cycle_decided', transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'release_decisions',
        'idx_release_decisions_feature_cycle_decided',
        { transaction },
      );
      await queryInterface.removeIndex('qa_sign_offs', 'idx_qa_sign_offs_feature_cycle_signed', {
        transaction,
      });
      await sequelize.query(
        `ALTER TABLE release_decisions
           DROP CONSTRAINT IF EXISTS ck_release_decisions_candidate_fingerprint,
           DROP CONSTRAINT IF EXISTS fk_release_decisions_readiness_baseline,
           DROP CONSTRAINT IF EXISTS fk_release_decisions_test_cycle;
         ALTER TABLE qa_sign_offs
           DROP CONSTRAINT IF EXISTS ck_qa_sign_offs_candidate_fingerprint,
           DROP CONSTRAINT IF EXISTS fk_qa_sign_offs_readiness_baseline,
           DROP CONSTRAINT IF EXISTS fk_qa_sign_offs_test_cycle,
           DROP CONSTRAINT IF EXISTS fk_qa_sign_offs_qa_subtask;`,
        { transaction },
      );
      for (const column of ['candidate_fingerprint', 'readiness_baseline_id', 'test_cycle_id']) {
        await queryInterface.removeColumn('release_decisions', column, { transaction });
      }
      for (const column of [
        'candidate_fingerprint',
        'readiness_baseline_id',
        'test_cycle_id',
        'qa_subtask_id',
      ]) {
        await queryInterface.removeColumn('qa_sign_offs', column, { transaction });
      }
    });
  },
};
