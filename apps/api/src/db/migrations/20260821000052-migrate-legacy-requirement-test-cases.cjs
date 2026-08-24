'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      const [invalidRows] = await sequelize.query(
        `SELECT id, title, test_type
         FROM requirement_test_cases
         WHERE length(btrim(title)) = 0
            OR test_type NOT IN ('manual', 'e2e', 'integration', 'unit')
         LIMIT 1;`,
        { transaction },
      );
      if (invalidRows.length > 0) {
        throw new Error(
          `Legacy Requirement Test Case ${invalidRows[0].id} cannot be migrated without inventing canonical values.`,
        );
      }

      const [collisionRows] = await sequelize.query(
        `SELECT legacy.id
         FROM requirement_test_cases legacy
         INNER JOIN test_cases canonical ON canonical.id = legacy.id
         LIMIT 1;`,
        { transaction },
      );
      if (collisionRows.length > 0) {
        throw new Error(
          `Canonical Test Case ID collision for legacy Requirement Test Case ${collisionRows[0].id}; migration aborted without overwriting data.`,
        );
      }

      const [[sourceCountRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM requirement_test_cases;',
        { transaction },
      );
      const [[canonicalBeforeRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM test_cases;',
        { transaction },
      );
      const [[runBeforeRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM test_runs;',
        { transaction },
      );
      const [[resultBeforeRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM test_results;',
        { transaction },
      );

      await queryInterface.createTable(
        'legacy_requirement_test_case_migrations',
        {
          legacy_test_case_id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_case_id: { type: Sequelize.UUID, allowNull: false },
          requirement_id: { type: Sequelize.UUID, allowNull: false },
          legacy_title: { type: Sequelize.STRING(255), allowNull: false },
          legacy_test_type: { type: Sequelize.STRING(50), allowNull: false },
          legacy_status: { type: Sequelize.STRING(50), allowNull: false },
          legacy_execution_details: { type: Sequelize.TEXT, allowNull: true },
          legacy_created_by: { type: Sequelize.UUID, allowNull: false },
          legacy_created_at: { type: Sequelize.DATE, allowNull: false },
          legacy_updated_at: { type: Sequelize.DATE, allowNull: false },
          migrated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE legacy_requirement_test_case_migrations
         ADD CONSTRAINT uk_legacy_test_case_migrations_workspace_case
           UNIQUE (workspace_id, test_case_id),
         ADD CONSTRAINT fk_legacy_test_case_migrations_workspace
           FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_legacy_test_case_migrations_source
           FOREIGN KEY (legacy_test_case_id) REFERENCES requirement_test_cases(id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_legacy_test_case_migrations_case
           FOREIGN KEY (workspace_id, test_case_id) REFERENCES test_cases(workspace_id, id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_legacy_test_case_migrations_requirement
           FOREIGN KEY (workspace_id, requirement_id) REFERENCES requirements(workspace_id, id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_legacy_test_case_migrations_same_id
           CHECK (legacy_test_case_id = test_case_id);`,
        { transaction },
      );

      await sequelize.query(
        `INSERT INTO test_cases (
           id, workspace_id, title, description, test_type, status,
           preconditions, steps_json, expected_result, created_by, created_at, updated_at
         )
         SELECT
           id, workspace_id, title, NULL, test_type, 'active',
           NULL, '[]'::jsonb, NULL, created_by, created_at, updated_at
         FROM requirement_test_cases;`,
        { transaction },
      );

      await sequelize.query(
        `INSERT INTO test_case_requirements (
           workspace_id, test_case_id, requirement_id, linked_by, linked_at
         )
         SELECT workspace_id, id, requirement_id, created_by, created_at
         FROM requirement_test_cases;`,
        { transaction },
      );

      await sequelize.query(
        `INSERT INTO legacy_requirement_test_case_migrations (
           legacy_test_case_id, workspace_id, test_case_id, requirement_id,
           legacy_title, legacy_test_type, legacy_status, legacy_execution_details,
           legacy_created_by, legacy_created_at, legacy_updated_at
         )
         SELECT
           id, workspace_id, id, requirement_id,
           title, test_type, status, execution_details,
           created_by, created_at, updated_at
         FROM requirement_test_cases;`,
        { transaction },
      );

      const [[canonicalAfterRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM test_cases;',
        { transaction },
      );
      const [[mappedCountRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM legacy_requirement_test_case_migrations;',
        { transaction },
      );
      const [[linkedCountRow]] = await sequelize.query(
        `SELECT COUNT(*)::int AS count
         FROM test_case_requirements links
         INNER JOIN legacy_requirement_test_case_migrations migrated
           ON migrated.workspace_id = links.workspace_id
          AND migrated.test_case_id = links.test_case_id
          AND migrated.requirement_id = links.requirement_id;`,
        { transaction },
      );
      const [[runAfterRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM test_runs;',
        { transaction },
      );
      const [[resultAfterRow]] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM test_results;',
        { transaction },
      );

      if (
        canonicalAfterRow.count !== canonicalBeforeRow.count + sourceCountRow.count ||
        mappedCountRow.count !== sourceCountRow.count ||
        linkedCountRow.count !== sourceCountRow.count
      ) {
        throw new Error(
          'Legacy Requirement Test Case row/link verification failed; migration rolled back.',
        );
      }
      if (
        runAfterRow.count !== runBeforeRow.count ||
        resultAfterRow.count !== resultBeforeRow.count
      ) {
        throw new Error(
          'Legacy migration must not create Test Runs or Test Results; migration rolled back.',
        );
      }
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      const [runRows] = await sequelize.query(
        `SELECT runs.id
         FROM test_runs runs
         INNER JOIN legacy_requirement_test_case_migrations migrated
           ON migrated.workspace_id = runs.workspace_id
          AND migrated.test_case_id = runs.test_case_id
         LIMIT 1;`,
        { transaction },
      );
      if (runRows.length > 0) {
        throw new Error(
          'Rollback refused: a migrated Test Case has Test Run history. Preserve or reassign that history before retrying.',
        );
      }

      const [extraLinkRows] = await sequelize.query(
        `SELECT links.test_case_id, links.requirement_id
         FROM test_case_requirements links
         INNER JOIN legacy_requirement_test_case_migrations migrated
           ON migrated.workspace_id = links.workspace_id
          AND migrated.test_case_id = links.test_case_id
         WHERE links.requirement_id <> migrated.requirement_id
         LIMIT 1;`,
        { transaction },
      );
      if (extraLinkRows.length > 0) {
        throw new Error(
          'Rollback refused: a migrated Test Case has additional Requirement links. Preserve or reassign them before retrying.',
        );
      }

      const [changedRows] = await sequelize.query(
        `SELECT canonical.id
         FROM test_cases canonical
         INNER JOIN legacy_requirement_test_case_migrations migrated
           ON migrated.workspace_id = canonical.workspace_id
          AND migrated.test_case_id = canonical.id
         WHERE canonical.title <> migrated.legacy_title
            OR canonical.test_type <> migrated.legacy_test_type
            OR canonical.status <> 'active'
            OR canonical.description IS NOT NULL
            OR canonical.preconditions IS NOT NULL
            OR canonical.steps_json <> '[]'::jsonb
            OR canonical.expected_result IS NOT NULL
            OR canonical.created_by <> migrated.legacy_created_by
            OR canonical.created_at <> migrated.legacy_created_at
            OR canonical.updated_at <> migrated.legacy_updated_at
         LIMIT 1;`,
        { transaction },
      );
      if (changedRows.length > 0) {
        throw new Error(
          'Rollback refused: a migrated Test Case definition has changed. Export and reconcile the canonical record before retrying.',
        );
      }

      await sequelize.query(
        `ALTER TABLE legacy_requirement_test_case_migrations
         DROP CONSTRAINT fk_legacy_test_case_migrations_case;`,
        { transaction },
      );
      await sequelize.query(
        `DELETE FROM test_case_requirements links
         USING legacy_requirement_test_case_migrations migrated
         WHERE links.workspace_id = migrated.workspace_id
           AND links.test_case_id = migrated.test_case_id
           AND links.requirement_id = migrated.requirement_id;`,
        { transaction },
      );
      await sequelize.query(
        `DELETE FROM test_cases canonical
         USING legacy_requirement_test_case_migrations migrated
         WHERE canonical.workspace_id = migrated.workspace_id
           AND canonical.id = migrated.test_case_id;`,
        { transaction },
      );
      await queryInterface.dropTable('legacy_requirement_test_case_migrations', { transaction });
    });
  },
};
