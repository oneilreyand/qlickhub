'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE qa_document_versions
         ADD CONSTRAINT uk_qa_document_versions_workspace_id UNIQUE (workspace_id, id);`,
        { transaction },
      );

      await queryInterface.createTable(
        'feature_readiness_reviews',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          reviewer_role: { type: Sequelize.STRING(16), allowNull: false },
          recommendation: { type: Sequelize.STRING(32), allowNull: false },
          notes: { type: Sequelize.TEXT, allowNull: false },
          concern_severity: { type: Sequelize.STRING(16), allowNull: true },
          created_by: { type: Sequelize.UUID, allowNull: false },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE feature_readiness_reviews
         ADD CONSTRAINT uk_feature_readiness_reviews_scope_id
           UNIQUE (workspace_id, feature_task_id, id),
         ADD CONSTRAINT fk_feature_readiness_reviews_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_reviews_feature FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_reviews_reviewer FOREIGN KEY (workspace_id, created_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_feature_readiness_reviews_role
           CHECK (reviewer_role IN ('dev', 'qa')),
         ADD CONSTRAINT ck_feature_readiness_reviews_recommendation
           CHECK (recommendation IN ('ready', 'changes_requested')),
         ADD CONSTRAINT ck_feature_readiness_reviews_notes
           CHECK (length(btrim(notes)) BETWEEN 1 AND 10000),
         ADD CONSTRAINT ck_feature_readiness_reviews_concern
           CHECK (
             (recommendation = 'ready' AND concern_severity IS NULL)
             OR
             (recommendation = 'changes_requested' AND concern_severity IN ('critical', 'high', 'medium', 'low'))
           );`,
        { transaction },
      );

      await queryInterface.createTable(
        'feature_readiness_baselines',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          sequence: { type: Sequelize.INTEGER, allowNull: false },
          mode: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'observation' },
          product_brief_version_id: { type: Sequelize.UUID, allowNull: false },
          dev_review_id: { type: Sequelize.UUID, allowNull: true },
          qa_review_id: { type: Sequelize.UUID, allowNull: true },
          snapshot_json: { type: Sequelize.JSONB, allowNull: false },
          established_by: { type: Sequelize.UUID, allowNull: false },
          established_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          override_reason: { type: Sequelize.TEXT, allowNull: true },
          override_expires_at: { type: Sequelize.DATE, allowNull: true },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE feature_readiness_baselines
         ADD CONSTRAINT uk_feature_readiness_baselines_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT uk_feature_readiness_baselines_feature_sequence
           UNIQUE (workspace_id, feature_task_id, sequence),
         ADD CONSTRAINT fk_feature_readiness_baselines_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baselines_feature FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baselines_brief_version
           FOREIGN KEY (workspace_id, product_brief_version_id)
           REFERENCES qa_document_versions(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baselines_dev_review
           FOREIGN KEY (workspace_id, feature_task_id, dev_review_id)
           REFERENCES feature_readiness_reviews(workspace_id, feature_task_id, id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baselines_qa_review
           FOREIGN KEY (workspace_id, feature_task_id, qa_review_id)
           REFERENCES feature_readiness_reviews(workspace_id, feature_task_id, id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baselines_establisher
           FOREIGN KEY (workspace_id, established_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_feature_readiness_baselines_sequence CHECK (sequence > 0),
         ADD CONSTRAINT ck_feature_readiness_baselines_mode CHECK (mode = 'observation'),
         ADD CONSTRAINT ck_feature_readiness_baselines_snapshot
           CHECK (jsonb_typeof(snapshot_json) = 'object'),
         ADD CONSTRAINT ck_feature_readiness_baselines_override_pair CHECK (
           (override_reason IS NULL AND override_expires_at IS NULL)
           OR
           (length(btrim(override_reason)) BETWEEN 1 AND 10000 AND override_expires_at IS NOT NULL)
         );`,
        { transaction },
      );

      await queryInterface.createTable(
        'feature_readiness_baseline_requirements',
        {
          workspace_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
          baseline_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
          requirement_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE feature_readiness_baseline_requirements
         ADD CONSTRAINT fk_feature_readiness_baseline_requirements_workspace
           FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baseline_requirements_baseline
           FOREIGN KEY (workspace_id, baseline_id)
           REFERENCES feature_readiness_baselines(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_feature_readiness_baseline_requirements_requirement
           FOREIGN KEY (workspace_id, requirement_id)
           REFERENCES requirements(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE;`,
        { transaction },
      );

      await queryInterface.addIndex(
        'feature_readiness_reviews',
        ['workspace_id', 'feature_task_id', 'reviewer_role', 'created_at'],
        { name: 'idx_feature_readiness_reviews_latest', transaction },
      );
      await queryInterface.addIndex(
        'feature_readiness_baselines',
        ['workspace_id', 'feature_task_id', 'sequence'],
        { name: 'idx_feature_readiness_baselines_latest', transaction },
      );
      await queryInterface.addIndex(
        'feature_readiness_baseline_requirements',
        ['workspace_id', 'requirement_id'],
        { name: 'idx_feature_readiness_baseline_requirements_requirement', transaction },
      );

      await sequelize.query(
        `CREATE FUNCTION prevent_feature_readiness_update()
         RETURNS trigger AS $$
         BEGIN
           RAISE EXCEPTION 'Feature readiness records are append-only and cannot be updated';
         END;
         $$ LANGUAGE plpgsql;

         CREATE TRIGGER trg_feature_readiness_reviews_immutable
           BEFORE UPDATE ON feature_readiness_reviews
           FOR EACH ROW EXECUTE FUNCTION prevent_feature_readiness_update();

         CREATE TRIGGER trg_feature_readiness_baselines_immutable
           BEFORE UPDATE ON feature_readiness_baselines
           FOR EACH ROW EXECUTE FUNCTION prevent_feature_readiness_update();`,
        { transaction },
      );

      await sequelize.query(
        `CREATE OR REPLACE FUNCTION prevent_release_critical_task_soft_delete()
         RETURNS trigger AS $$
         BEGIN
           IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND (
             EXISTS (SELECT 1 FROM task_attachments WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_requirements WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_documents WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM bugs WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM feature_readiness_reviews WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM feature_readiness_baselines WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (
               SELECT 1 FROM qa_sign_offs qso
               WHERE qso.workspace_id = OLD.workspace_id
                 AND qso.feature_task_id = OLD.id
                 AND NOT EXISTS (
                   SELECT 1 FROM qa_sign_off_cancellations qsoc
                   WHERE qsoc.workspace_id = qso.workspace_id
                     AND qsoc.qa_sign_off_id = qso.id
                 )
             )
             OR EXISTS (
               SELECT 1 FROM release_decisions rd
               WHERE rd.workspace_id = OLD.workspace_id
                 AND rd.feature_task_id = OLD.id
                 AND NOT EXISTS (
                   SELECT 1 FROM release_decision_cancellations rdc
                   WHERE rdc.workspace_id = rd.workspace_id
                     AND rdc.release_decision_id = rd.id
                 )
             )
           ) THEN
             RAISE EXCEPTION 'Task has release-critical records and cannot be soft-deleted'
               USING ERRCODE = '23503';
           END IF;
           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE OR REPLACE FUNCTION prevent_release_critical_task_soft_delete()
         RETURNS trigger AS $$
         BEGIN
           IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND (
             EXISTS (SELECT 1 FROM task_attachments WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_requirements WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM task_documents WHERE workspace_id = OLD.workspace_id AND task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM bugs WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (
               SELECT 1 FROM qa_sign_offs qso
               WHERE qso.workspace_id = OLD.workspace_id
                 AND qso.feature_task_id = OLD.id
                 AND NOT EXISTS (
                   SELECT 1 FROM qa_sign_off_cancellations qsoc
                   WHERE qsoc.workspace_id = qso.workspace_id
                     AND qsoc.qa_sign_off_id = qso.id
                 )
             )
             OR EXISTS (
               SELECT 1 FROM release_decisions rd
               WHERE rd.workspace_id = OLD.workspace_id
                 AND rd.feature_task_id = OLD.id
                 AND NOT EXISTS (
                   SELECT 1 FROM release_decision_cancellations rdc
                   WHERE rdc.workspace_id = rd.workspace_id
                     AND rdc.release_decision_id = rd.id
                 )
             )
           ) THEN
             RAISE EXCEPTION 'Task has release-critical records and cannot be soft-deleted'
               USING ERRCODE = '23503';
           END IF;
           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction },
      );

      await queryInterface.dropTable('feature_readiness_baseline_requirements', { transaction });
      await queryInterface.dropTable('feature_readiness_baselines', { transaction });
      await queryInterface.dropTable('feature_readiness_reviews', { transaction });
      await sequelize.query('DROP FUNCTION IF EXISTS prevent_feature_readiness_update();', {
        transaction,
      });
      await sequelize.query(
        'ALTER TABLE qa_document_versions DROP CONSTRAINT IF EXISTS uk_qa_document_versions_workspace_id;',
        { transaction },
      );
    });
  },
};
