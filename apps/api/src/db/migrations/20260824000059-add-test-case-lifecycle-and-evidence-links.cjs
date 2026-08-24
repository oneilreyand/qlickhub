'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Extend test_cases table
      await sequelize.query(
        `ALTER TABLE test_cases
           ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100) NULL,
           ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NOT NULL DEFAULT 'medium',
           ADD COLUMN IF NOT EXISTS test_data TEXT NULL,
           ADD COLUMN IF NOT EXISTS scenario_kind VARCHAR(32) NOT NULL DEFAULT 'positive',
           ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'native';`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_cases
           DROP CONSTRAINT IF EXISTS ck_test_cases_status;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_cases
           ADD CONSTRAINT ck_test_cases_status
             CHECK (status IN ('draft', 'in_review', 'active', 'archived')),
           ADD CONSTRAINT ck_test_cases_priority
             CHECK (priority IN ('high', 'medium', 'low')),
           ADD CONSTRAINT ck_test_cases_scenario_kind
             CHECK (scenario_kind IN ('positive', 'negative')),
           ADD CONSTRAINT ck_test_cases_source
             CHECK (source IN ('native', 'spreadsheet_import'));`,
        { transaction },
      );

      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_test_cases_workspace_external_reference
           ON test_cases (workspace_id, external_reference)
           WHERE external_reference IS NOT NULL;`,
        { transaction },
      );

      // 1b. Update test_case_activity actions check constraint
      await sequelize.query(
        `ALTER TABLE test_case_activity
           DROP CONSTRAINT IF EXISTS ck_test_case_activity_action;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_activity
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
           );`,
        { transaction },
      );

      // 2. Create test_case_imports table
      await queryInterface.createTable(
        'test_case_imports',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'workspaces', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          actor_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          source_file_name: { type: Sequelize.STRING(255), allowNull: false },
          content_hash: { type: Sequelize.STRING(64), allowNull: false },
          template_version: { type: Sequelize.STRING(32), allowNull: false, defaultValue: '1.0' },
          mode: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'create_only' },
          status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'completed' },
          total_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          created_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          updated_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          skipped_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          failed_rows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          completed_at: { type: Sequelize.DATE, allowNull: true },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_imports
           ADD CONSTRAINT ck_test_case_imports_mode CHECK (mode IN ('create_only', 'update')),
           ADD CONSTRAINT ck_test_case_imports_status CHECK (status IN ('in_progress', 'completed', 'failed'));`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_test_case_imports_workspace_created
           ON test_case_imports (workspace_id, created_at DESC);`,
        { transaction },
      );

      // 3. Create test_case_import_rows table
      await queryInterface.createTable(
        'test_case_import_rows',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          import_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'test_case_imports', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          source_row_number: { type: Sequelize.INTEGER, allowNull: false },
          external_reference: { type: Sequelize.STRING(100), allowNull: true },
          parsed_payload: { type: Sequelize.JSONB, allowNull: false },
          outcome: { type: Sequelize.STRING(32), allowNull: false },
          validation_errors: { type: Sequelize.JSONB, allowNull: true },
          test_case_id: { type: Sequelize.UUID, allowNull: true },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_import_rows
           ADD CONSTRAINT ck_test_case_import_rows_outcome CHECK (outcome IN ('created', 'updated', 'skipped', 'failed'));`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_test_case_import_rows_import_row
           ON test_case_import_rows (import_id, source_row_number);`,
        { transaction },
      );

      // 4. Create test_result_evidence_links table
      await queryInterface.createTable(
        'test_result_evidence_links',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'workspaces', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          test_result_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'test_results', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          url: { type: Sequelize.TEXT, allowNull: false },
          provider: { type: Sequelize.STRING(64), allowNull: false },
          media_kind: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'other' },
          label: { type: Sequelize.STRING(255), allowNull: true },
          added_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          added_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          normalized_url: { type: Sequelize.TEXT, allowNull: false },
          preview_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'ready' },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_result_evidence_links
           ADD CONSTRAINT ck_test_result_evidence_links_media_kind
             CHECK (media_kind IN ('image', 'video', 'document', 'other')),
           ADD CONSTRAINT ck_test_result_evidence_links_preview_status
             CHECK (preview_status IN ('ready', 'unsupported', 'restricted', 'failed'));`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_test_result_evidence_links_workspace_result
           ON test_result_evidence_links (workspace_id, test_result_id);`,
        { transaction },
      );

      // 5. Create bug_evidence_links table
      await queryInterface.createTable(
        'bug_evidence_links',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'workspaces', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          bug_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'bugs', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          url: { type: Sequelize.TEXT, allowNull: false },
          provider: { type: Sequelize.STRING(64), allowNull: false },
          media_kind: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'other' },
          label: { type: Sequelize.STRING(255), allowNull: true },
          added_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          added_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          normalized_url: { type: Sequelize.TEXT, allowNull: false },
          preview_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'ready' },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE bug_evidence_links
           ADD CONSTRAINT ck_bug_evidence_links_media_kind
             CHECK (media_kind IN ('image', 'video', 'document', 'other')),
           ADD CONSTRAINT ck_bug_evidence_links_preview_status
             CHECK (preview_status IN ('ready', 'unsupported', 'restricted', 'failed'));`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_bug_evidence_links_workspace_bug
           ON bug_evidence_links (workspace_id, bug_id);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP TABLE IF EXISTS bug_evidence_links;`, { transaction });
      await sequelize.query(`DROP TABLE IF EXISTS test_result_evidence_links;`, { transaction });
      await sequelize.query(`DROP TABLE IF EXISTS test_case_import_rows;`, { transaction });
      await sequelize.query(`DROP TABLE IF EXISTS test_case_imports;`, { transaction });
      await sequelize.query(`DROP INDEX IF EXISTS idx_test_cases_workspace_external_reference;`, {
        transaction,
      });
      await sequelize.query(
        `ALTER TABLE test_cases
           DROP CONSTRAINT IF EXISTS ck_test_cases_source,
           DROP CONSTRAINT IF EXISTS ck_test_cases_scenario_kind,
           DROP CONSTRAINT IF EXISTS ck_test_cases_priority,
           DROP CONSTRAINT IF EXISTS ck_test_cases_status;`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE test_cases
           ADD CONSTRAINT ck_test_cases_status CHECK (status IN ('active', 'archived')),
           DROP COLUMN IF EXISTS source,
           DROP COLUMN IF EXISTS scenario_kind,
           DROP COLUMN IF EXISTS test_data,
           DROP COLUMN IF EXISTS priority,
           DROP COLUMN IF EXISTS external_reference;`,
        { transaction },
      );
    });
  },
};
