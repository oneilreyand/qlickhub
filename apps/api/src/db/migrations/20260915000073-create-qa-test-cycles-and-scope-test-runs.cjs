'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'qa_test_cycles',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          qa_subtask_id: { type: Sequelize.UUID, allowNull: false },
          readiness_baseline_id: { type: Sequelize.UUID, allowNull: false },
          candidate_fingerprint: { type: Sequelize.STRING(255), allowNull: false },
          build: { type: Sequelize.STRING(100), allowNull: false },
          environment: { type: Sequelize.STRING(100), allowNull: false },
          status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'in_progress' },
          owner_qa_id: { type: Sequelize.UUID, allowNull: false },
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
        `ALTER TABLE qa_test_cycles
           ADD CONSTRAINT uk_qa_test_cycles_workspace_id UNIQUE (workspace_id, id),
           ADD CONSTRAINT fk_qa_test_cycles_workspace FOREIGN KEY (workspace_id)
             REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qa_test_cycles_feature FOREIGN KEY (feature_task_id, workspace_id)
             REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qa_test_cycles_qa_subtask FOREIGN KEY (qa_subtask_id, workspace_id)
             REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qa_test_cycles_baseline FOREIGN KEY (workspace_id, readiness_baseline_id)
             REFERENCES feature_readiness_baselines(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_qa_test_cycles_owner FOREIGN KEY (workspace_id, owner_qa_id)
             REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_qa_test_cycles_status
             CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'superseded')),
           ADD CONSTRAINT ck_qa_test_cycles_candidate_not_blank
             CHECK (length(btrim(candidate_fingerprint)) BETWEEN 1 AND 255),
           ADD CONSTRAINT ck_qa_test_cycles_build_not_blank CHECK (length(btrim(build)) > 0),
           ADD CONSTRAINT ck_qa_test_cycles_environment_not_blank CHECK (length(btrim(environment)) > 0);`,
        { transaction },
      );
      await queryInterface.addIndex(
        'qa_test_cycles',
        ['workspace_id', 'feature_task_id', 'qa_subtask_id', 'status'],
        {
          name: 'idx_qa_test_cycles_workspace_feature_subtask_status',
          transaction,
        },
      );

      await sequelize.query(
        `ALTER TABLE test_runs
           ADD COLUMN feature_task_id UUID NULL,
           ADD COLUMN qa_subtask_id UUID NULL,
           ADD COLUMN test_cycle_id UUID NULL,
           ADD COLUMN test_case_version_id UUID NULL,
           ADD COLUMN readiness_baseline_id UUID NULL,
           ADD COLUMN candidate_fingerprint VARCHAR(255) NULL,
           ADD CONSTRAINT fk_test_runs_feature FOREIGN KEY (feature_task_id, workspace_id)
             REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_runs_qa_subtask FOREIGN KEY (qa_subtask_id, workspace_id)
             REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_runs_cycle FOREIGN KEY (workspace_id, test_cycle_id)
             REFERENCES qa_test_cycles(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_runs_version FOREIGN KEY (workspace_id, test_case_version_id)
             REFERENCES test_case_versions(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_runs_baseline FOREIGN KEY (workspace_id, readiness_baseline_id)
             REFERENCES feature_readiness_baselines(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_test_runs_scope_all_or_legacy CHECK (
             (feature_task_id IS NULL AND qa_subtask_id IS NULL AND test_cycle_id IS NULL
              AND test_case_version_id IS NULL AND readiness_baseline_id IS NULL AND candidate_fingerprint IS NULL)
             OR
             (feature_task_id IS NOT NULL AND qa_subtask_id IS NOT NULL AND test_cycle_id IS NOT NULL
              AND test_case_version_id IS NOT NULL AND readiness_baseline_id IS NOT NULL
              AND length(btrim(candidate_fingerprint)) BETWEEN 1 AND 255)
           );`,
        { transaction },
      );
      await queryInterface.addIndex(
        'test_runs',
        ['workspace_id', 'feature_task_id', 'qa_subtask_id', 'test_cycle_id'],
        {
          name: 'idx_test_runs_workspace_feature_subtask_cycle',
          transaction,
        },
      );

      await sequelize.query(
        `CREATE FUNCTION validate_scoped_test_run()
         RETURNS TRIGGER
         LANGUAGE plpgsql
         AS $$
         DECLARE cycle_row qa_test_cycles%ROWTYPE;
         DECLARE version_case_id UUID;
         BEGIN
           IF NEW.test_cycle_id IS NULL THEN
             RETURN NEW;
           END IF;

           SELECT * INTO cycle_row
             FROM qa_test_cycles
            WHERE workspace_id = NEW.workspace_id AND id = NEW.test_cycle_id;
           IF NOT FOUND THEN
             RAISE EXCEPTION 'Test Run Test Cycle scope was not found.';
           END IF;
           IF NEW.feature_task_id IS DISTINCT FROM cycle_row.feature_task_id
              OR NEW.qa_subtask_id IS DISTINCT FROM cycle_row.qa_subtask_id
              OR NEW.readiness_baseline_id IS DISTINCT FROM cycle_row.readiness_baseline_id
              OR NEW.candidate_fingerprint IS DISTINCT FROM cycle_row.candidate_fingerprint
              OR NEW.build IS DISTINCT FROM cycle_row.build
              OR NEW.environment IS DISTINCT FROM cycle_row.environment THEN
             RAISE EXCEPTION 'Test Run scope must exactly match its Test Cycle candidate, baseline, Feature, QA Subtask, build, and environment.';
           END IF;
           IF cycle_row.status NOT IN ('planned', 'in_progress') THEN
             RAISE EXCEPTION 'Test Run cannot be created in a closed or superseded Test Cycle.';
           END IF;

           SELECT test_case_id INTO version_case_id
             FROM test_case_versions
            WHERE workspace_id = NEW.workspace_id AND id = NEW.test_case_version_id;
           IF version_case_id IS DISTINCT FROM NEW.test_case_id THEN
             RAISE EXCEPTION 'Test Run Test Case version does not belong to its Test Case.';
           END IF;
           RETURN NEW;
         END;
         $$;

         CREATE TRIGGER trg_test_runs_validate_scope
           BEFORE INSERT OR UPDATE OF feature_task_id, qa_subtask_id, test_cycle_id,
             test_case_version_id, readiness_baseline_id, candidate_fingerprint, build, environment
           ON test_runs
           FOR EACH ROW EXECUTE FUNCTION validate_scoped_test_run();`,
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
             OR EXISTS (SELECT 1 FROM requirement_findings WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM qa_test_cycles WHERE workspace_id = OLD.workspace_id AND (feature_task_id = OLD.id OR qa_subtask_id = OLD.id))
             OR EXISTS (SELECT 1 FROM test_runs WHERE workspace_id = OLD.workspace_id AND (feature_task_id = OLD.id OR qa_subtask_id = OLD.id))
             OR EXISTS (
               SELECT 1 FROM qa_sign_offs qso WHERE qso.workspace_id = OLD.workspace_id AND qso.feature_task_id = OLD.id
                 AND NOT EXISTS (SELECT 1 FROM qa_sign_off_cancellations qsoc WHERE qsoc.workspace_id = qso.workspace_id AND qsoc.qa_sign_off_id = qso.id)
             )
             OR EXISTS (
               SELECT 1 FROM release_decisions rd WHERE rd.workspace_id = OLD.workspace_id AND rd.feature_task_id = OLD.id
                 AND NOT EXISTS (SELECT 1 FROM release_decision_cancellations rdc WHERE rdc.workspace_id = rd.workspace_id AND rdc.release_decision_id = rd.id)
             )
           ) THEN
             RAISE EXCEPTION 'Task has release-critical records and cannot be soft-deleted' USING ERRCODE = '23503';
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
             OR EXISTS (SELECT 1 FROM feature_readiness_reviews WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM feature_readiness_baselines WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (SELECT 1 FROM requirement_findings WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
             OR EXISTS (
               SELECT 1 FROM qa_sign_offs qso WHERE qso.workspace_id = OLD.workspace_id AND qso.feature_task_id = OLD.id
                 AND NOT EXISTS (SELECT 1 FROM qa_sign_off_cancellations qsoc WHERE qsoc.workspace_id = qso.workspace_id AND qsoc.qa_sign_off_id = qso.id)
             )
             OR EXISTS (
               SELECT 1 FROM release_decisions rd WHERE rd.workspace_id = OLD.workspace_id AND rd.feature_task_id = OLD.id
                 AND NOT EXISTS (SELECT 1 FROM release_decision_cancellations rdc WHERE rdc.workspace_id = rd.workspace_id AND rdc.release_decision_id = rd.id)
             )
           ) THEN
             RAISE EXCEPTION 'Task has release-critical records and cannot be soft-deleted' USING ERRCODE = '23503';
           END IF;
           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;
         DROP TRIGGER IF EXISTS trg_test_runs_validate_scope ON test_runs;
         DROP FUNCTION IF EXISTS validate_scoped_test_run();
         ALTER TABLE test_runs
           DROP CONSTRAINT IF EXISTS fk_test_runs_feature,
           DROP CONSTRAINT IF EXISTS fk_test_runs_qa_subtask,
           DROP CONSTRAINT IF EXISTS fk_test_runs_cycle,
           DROP CONSTRAINT IF EXISTS fk_test_runs_version,
           DROP CONSTRAINT IF EXISTS fk_test_runs_baseline,
           DROP CONSTRAINT IF EXISTS ck_test_runs_scope_all_or_legacy,
           DROP COLUMN IF EXISTS feature_task_id,
           DROP COLUMN IF EXISTS qa_subtask_id,
           DROP COLUMN IF EXISTS test_cycle_id,
           DROP COLUMN IF EXISTS test_case_version_id,
           DROP COLUMN IF EXISTS readiness_baseline_id,
           DROP COLUMN IF EXISTS candidate_fingerprint;`,
        { transaction },
      );
      await queryInterface.removeIndex(
        'qa_test_cycles',
        'idx_qa_test_cycles_workspace_feature_subtask_status',
        { transaction },
      );
      await queryInterface.dropTable('qa_test_cycles', { transaction });
    });
  },
};
