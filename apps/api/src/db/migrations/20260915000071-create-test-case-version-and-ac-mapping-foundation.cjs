'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'test_case_versions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_case_id: { type: Sequelize.UUID, allowNull: false },
          revision: { type: Sequelize.INTEGER, allowNull: false },
          lifecycle_status: { type: Sequelize.STRING(32), allowNull: false },
          definition_snapshot: { type: Sequelize.JSONB, allowNull: false },
          authored_by: { type: Sequelize.UUID, allowNull: false },
          published_by: { type: Sequelize.UUID, allowNull: true },
          published_at: { type: Sequelize.DATE, allowNull: true },
          supersedes_version_id: { type: Sequelize.UUID, allowNull: true },
          origin: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: 'native_revision',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_versions
           ADD CONSTRAINT uk_test_case_versions_workspace_id UNIQUE (workspace_id, id),
           ADD CONSTRAINT uk_test_case_versions_case_revision UNIQUE (workspace_id, test_case_id, revision),
           ADD CONSTRAINT fk_test_case_versions_workspace FOREIGN KEY (workspace_id)
             REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_versions_case FOREIGN KEY (workspace_id, test_case_id)
             REFERENCES test_cases(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_versions_author FOREIGN KEY (authored_by)
             REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_versions_publisher FOREIGN KEY (published_by)
             REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_versions_supersedes FOREIGN KEY (workspace_id, supersedes_version_id)
             REFERENCES test_case_versions(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_test_case_versions_revision_positive CHECK (revision > 0),
           ADD CONSTRAINT ck_test_case_versions_status CHECK
             (lifecycle_status IN ('draft', 'in_review', 'active', 'archived')),
           ADD CONSTRAINT ck_test_case_versions_origin CHECK
             (origin IN ('legacy_backfill', 'native_revision')),
           ADD CONSTRAINT ck_test_case_versions_snapshot_object CHECK
             (jsonb_typeof(definition_snapshot) = 'object'),
           ADD CONSTRAINT ck_test_case_versions_publication CHECK (
             (lifecycle_status = 'active' AND published_by IS NOT NULL AND published_at IS NOT NULL)
             OR (lifecycle_status <> 'active' AND published_by IS NULL AND published_at IS NULL)
           );`,
        { transaction },
      );

      await queryInterface.addIndex(
        'test_case_versions',
        ['workspace_id', 'test_case_id', 'revision'],
        { name: 'idx_test_case_versions_case_revision', transaction },
      );

      await sequelize.query(
        `CREATE OR REPLACE FUNCTION prevent_test_case_version_update()
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

      await queryInterface.createTable(
        'test_case_version_acceptance_criteria',
        {
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_case_version_id: { type: Sequelize.UUID, allowNull: false },
          acceptance_criterion_id: { type: Sequelize.UUID, allowNull: false },
          mapping_status: { type: Sequelize.STRING(32), allowNull: false },
          exclusion_reason: { type: Sequelize.TEXT, allowNull: true },
          mapped_by: { type: Sequelize.UUID, allowNull: false },
          mapped_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_version_acceptance_criteria
           ADD CONSTRAINT pk_test_case_version_acceptance_criteria
             PRIMARY KEY (workspace_id, test_case_version_id, acceptance_criterion_id),
           ADD CONSTRAINT fk_test_case_version_ac_workspace FOREIGN KEY (workspace_id)
             REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_version_ac_version
             FOREIGN KEY (workspace_id, test_case_version_id)
             REFERENCES test_case_versions(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_version_ac_criterion
             FOREIGN KEY (workspace_id, acceptance_criterion_id)
             REFERENCES acceptance_criteria(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_case_version_ac_mapper FOREIGN KEY (mapped_by)
             REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_test_case_version_ac_status CHECK
             (mapping_status IN ('mapped', 'excluded')),
           ADD CONSTRAINT ck_test_case_version_ac_exclusion_reason CHECK (
             (mapping_status = 'mapped' AND exclusion_reason IS NULL)
             OR (mapping_status = 'excluded' AND length(btrim(exclusion_reason)) > 0)
           );`,
        { transaction },
      );

      await queryInterface.addIndex(
        'test_case_version_acceptance_criteria',
        ['workspace_id', 'acceptance_criterion_id'],
        { name: 'idx_test_case_version_ac_criterion', transaction },
      );

      // Legacy Test Cases keep their mutable row for compatibility, but receive one deterministic,
      // immutable revision snapshot. Acceptance Criteria intentionally remain unmapped until a human
      // maps or explicitly excludes each one in the versioning workflow.
      await sequelize.query(
        `INSERT INTO test_case_versions (
           id, workspace_id, test_case_id, revision, lifecycle_status, definition_snapshot,
           authored_by, published_by, published_at, supersedes_version_id, origin, created_at
         )
         SELECT
           gen_random_uuid(),
           test_case.workspace_id,
           test_case.id,
           1,
           test_case.status,
           jsonb_build_object(
             'externalReference', test_case.external_reference,
             'title', test_case.title,
             'description', test_case.description,
             'testType', test_case.test_type,
             'priority', test_case.priority,
             'preconditions', test_case.preconditions,
             'steps', test_case.steps_json,
             'expectedResult', test_case.expected_result,
             'testData', test_case.test_data,
             'scenarioKind', test_case.scenario_kind,
             'source', test_case.source,
             'requirementIds', COALESCE((
               SELECT jsonb_agg(link.requirement_id ORDER BY link.requirement_id)
               FROM test_case_requirements link
               WHERE link.workspace_id = test_case.workspace_id
                 AND link.test_case_id = test_case.id
             ), '[]'::jsonb)
           ),
           test_case.created_by,
           CASE WHEN test_case.status = 'active' THEN test_case.created_by ELSE NULL END,
           CASE WHEN test_case.status = 'active' THEN test_case.updated_at ELSE NULL END,
           NULL,
           'legacy_backfill',
           test_case.created_at
         FROM test_cases test_case
         WHERE NOT EXISTS (
           SELECT 1
           FROM test_case_versions existing
           WHERE existing.workspace_id = test_case.workspace_id
             AND existing.test_case_id = test_case.id
             AND existing.revision = 1
         );`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('test_case_version_acceptance_criteria', { transaction });
      await sequelize.query(
        `DROP TRIGGER IF EXISTS trg_test_case_versions_immutable ON test_case_versions;
         DROP FUNCTION IF EXISTS prevent_test_case_version_update();`,
        { transaction },
      );
      await queryInterface.dropTable('test_case_versions', { transaction });
    });
  },
};
