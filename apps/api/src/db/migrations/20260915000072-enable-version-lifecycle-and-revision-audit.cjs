'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `DROP TRIGGER IF EXISTS trg_test_case_versions_immutable ON test_case_versions;
         DROP FUNCTION IF EXISTS prevent_test_case_version_update();

         CREATE FUNCTION validate_test_case_version_update()
         RETURNS TRIGGER
         LANGUAGE plpgsql
         AS $$
         BEGIN
           IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
              OR NEW.test_case_id IS DISTINCT FROM OLD.test_case_id
              OR NEW.revision IS DISTINCT FROM OLD.revision
              OR NEW.definition_snapshot IS DISTINCT FROM OLD.definition_snapshot
              OR NEW.authored_by IS DISTINCT FROM OLD.authored_by
              OR NEW.supersedes_version_id IS DISTINCT FROM OLD.supersedes_version_id
              OR NEW.origin IS DISTINCT FROM OLD.origin
              OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
             RAISE EXCEPTION 'Test Case version definition is immutable; create a new revision instead.';
           END IF;

           IF OLD.lifecycle_status = 'draft'
              AND NEW.lifecycle_status = 'in_review'
              AND NEW.published_by IS NULL
              AND NEW.published_at IS NULL THEN
             RETURN NEW;
           END IF;

           IF OLD.lifecycle_status = 'in_review'
              AND NEW.lifecycle_status = 'draft'
              AND NEW.published_by IS NULL
              AND NEW.published_at IS NULL THEN
             RETURN NEW;
           END IF;

           IF OLD.lifecycle_status = 'in_review'
              AND NEW.lifecycle_status = 'active'
              AND NEW.published_by IS NOT NULL
              AND NEW.published_at IS NOT NULL THEN
             RETURN NEW;
           END IF;

           IF OLD.lifecycle_status = 'active'
              AND NEW.lifecycle_status = 'archived'
              AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
              AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at THEN
             RETURN NEW;
           END IF;

           RAISE EXCEPTION 'Invalid immutable Test Case version lifecycle transition.';
         END;
         $$;

         CREATE TRIGGER trg_test_case_versions_definition_immutable
           BEFORE UPDATE ON test_case_versions
           FOR EACH ROW
           EXECUTE FUNCTION validate_test_case_version_update();`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_activity
           ADD COLUMN IF NOT EXISTS test_case_version_id UUID NULL;

         ALTER TABLE test_case_activity
           ADD CONSTRAINT fk_test_case_activity_version
             FOREIGN KEY (workspace_id, test_case_version_id)
             REFERENCES test_case_versions(workspace_id, id)
             ON DELETE RESTRICT ON UPDATE CASCADE;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_activity
           DROP CONSTRAINT IF EXISTS ck_test_case_activity_action;

         ALTER TABLE test_case_activity
           ADD CONSTRAINT ck_test_case_activity_action CHECK (
             action IN (
               'test_case_created',
               'test_case_updated',
               'test_case_status_changed',
               'test_case_imported',
               'test_run_started',
               'test_result_recorded',
               'test_evidence_link_added',
               'test_case_revision_created',
               'test_case_revision_status_changed',
               'test_case_ac_mapped',
               'test_case_ac_excluded'
             )
           );`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE test_case_activity
           DROP CONSTRAINT IF EXISTS fk_test_case_activity_version,
           DROP COLUMN IF EXISTS test_case_version_id;

         ALTER TABLE test_case_activity
           DROP CONSTRAINT IF EXISTS ck_test_case_activity_action;

         ALTER TABLE test_case_activity
           ADD CONSTRAINT ck_test_case_activity_action CHECK (
             action IN (
               'test_case_created',
               'test_case_updated',
               'test_case_status_changed',
               'test_case_imported',
               'test_run_started',
               'test_result_recorded',
               'test_evidence_link_added'
             )
           );

         DROP TRIGGER IF EXISTS trg_test_case_versions_definition_immutable ON test_case_versions;
         DROP FUNCTION IF EXISTS validate_test_case_version_update();

         CREATE FUNCTION prevent_test_case_version_update()
         RETURNS TRIGGER
         LANGUAGE plpgsql
         AS $$
         BEGIN
           RAISE EXCEPTION 'Test Case versions are immutable; create a new revision instead.';
         END;
         $$;

         CREATE TRIGGER trg_test_case_versions_immutable
           BEFORE UPDATE ON test_case_versions
           FOR EACH ROW
           EXECUTE FUNCTION prevent_test_case_version_update();`,
        { transaction },
      );
    });
  },
};
