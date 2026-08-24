'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'test_cases',
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
          title: { type: Sequelize.STRING(255), allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: true },
          test_type: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'manual' },
          status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'active' },
          preconditions: { type: Sequelize.TEXT, allowNull: true },
          steps_json: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
          expected_result: { type: Sequelize.TEXT, allowNull: true },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
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
        `ALTER TABLE test_cases
         ADD CONSTRAINT uk_test_cases_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT ck_test_cases_title_not_blank CHECK (length(btrim(title)) > 0),
         ADD CONSTRAINT ck_test_cases_type CHECK (test_type IN ('manual', 'e2e', 'integration', 'unit')),
         ADD CONSTRAINT ck_test_cases_status CHECK (status IN ('active', 'archived')),
         ADD CONSTRAINT ck_test_cases_steps_array CHECK (jsonb_typeof(steps_json) = 'array');`,
        { transaction },
      );

      await queryInterface.createTable(
        'test_case_requirements',
        {
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_case_id: { type: Sequelize.UUID, allowNull: false },
          requirement_id: { type: Sequelize.UUID, allowNull: false },
          linked_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          linked_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_requirements
         ADD CONSTRAINT pk_test_case_requirements PRIMARY KEY (workspace_id, test_case_id, requirement_id),
         ADD CONSTRAINT fk_test_case_requirements_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_case_requirements_case FOREIGN KEY (workspace_id, test_case_id)
           REFERENCES test_cases(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_case_requirements_requirement FOREIGN KEY (workspace_id, requirement_id)
           REFERENCES requirements(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction },
      );

      await queryInterface.createTable(
        'test_runs',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_case_id: { type: Sequelize.UUID, allowNull: false },
          build: { type: Sequelize.STRING(100), allowNull: false },
          environment: { type: Sequelize.STRING(100), allowNull: false },
          status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'in_progress' },
          executor_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          started_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          completed_at: { type: Sequelize.DATE, allowNull: true },
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
        `ALTER TABLE test_runs
         ADD CONSTRAINT uk_test_runs_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT fk_test_runs_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_runs_case FOREIGN KEY (workspace_id, test_case_id)
           REFERENCES test_cases(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT ck_test_runs_build_not_blank CHECK (length(btrim(build)) > 0),
         ADD CONSTRAINT ck_test_runs_environment_not_blank CHECK (length(btrim(environment)) > 0),
         ADD CONSTRAINT ck_test_runs_status CHECK (status IN ('in_progress', 'completed', 'cancelled')),
         ADD CONSTRAINT ck_test_runs_completion CHECK (
           (status = 'completed' AND completed_at IS NOT NULL)
           OR (status <> 'completed' AND completed_at IS NULL)
         );`,
        { transaction },
      );

      await queryInterface.createTable(
        'test_results',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_run_id: { type: Sequelize.UUID, allowNull: false },
          status: { type: Sequelize.STRING(32), allowNull: false },
          executor_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          actual_result: { type: Sequelize.TEXT, allowNull: true },
          notes: { type: Sequelize.TEXT, allowNull: true },
          executed_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
        `ALTER TABLE test_results
         ADD CONSTRAINT uk_test_results_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT uk_test_results_workspace_run UNIQUE (workspace_id, test_run_id),
         ADD CONSTRAINT fk_test_results_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_results_run FOREIGN KEY (workspace_id, test_run_id)
           REFERENCES test_runs(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT ck_test_results_status CHECK (status IN ('passed', 'failed', 'blocked', 'skipped'));`,
        { transaction },
      );

      await sequelize.query(
        `DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_constraint
             WHERE conname = 'uk_task_attachments_workspace_id'
               AND conrelid = 'task_attachments'::regclass
           ) THEN
             ALTER TABLE task_attachments
             ADD CONSTRAINT uk_task_attachments_workspace_id UNIQUE (workspace_id, id);
           END IF;
         END
         $$;`,
        { transaction },
      );

      await queryInterface.createTable(
        'test_result_evidence',
        {
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_result_id: { type: Sequelize.UUID, allowNull: false },
          attachment_id: { type: Sequelize.UUID, allowNull: false },
          linked_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          linked_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_result_evidence
         ADD CONSTRAINT pk_test_result_evidence PRIMARY KEY (workspace_id, test_result_id, attachment_id),
         ADD CONSTRAINT fk_test_result_evidence_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_result_evidence_result FOREIGN KEY (workspace_id, test_result_id)
           REFERENCES test_results(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_result_evidence_attachment FOREIGN KEY (workspace_id, attachment_id)
           REFERENCES task_attachments(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE;`,
        { transaction },
      );

      await queryInterface.createTable(
        'test_case_activity',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          test_case_id: { type: Sequelize.UUID, allowNull: false },
          test_run_id: { type: Sequelize.UUID, allowNull: true },
          test_result_id: { type: Sequelize.UUID, allowNull: true },
          actor_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          action: { type: Sequelize.STRING(100), allowNull: false },
          metadata_json: { type: Sequelize.JSONB, allowNull: true },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_case_activity
         ADD CONSTRAINT fk_test_case_activity_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_case_activity_case FOREIGN KEY (workspace_id, test_case_id)
           REFERENCES test_cases(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_case_activity_run FOREIGN KEY (workspace_id, test_run_id)
           REFERENCES test_runs(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_test_case_activity_result FOREIGN KEY (workspace_id, test_result_id)
           REFERENCES test_results(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT ck_test_case_activity_action CHECK (
           action IN ('test_case_created', 'test_run_started', 'test_result_recorded')
         );`,
        { transaction },
      );

      await queryInterface.addIndex('test_case_requirements', ['workspace_id', 'requirement_id'], {
        name: 'idx_test_case_requirements_requirement',
        transaction,
      });
      await queryInterface.addIndex('test_runs', ['workspace_id', 'test_case_id', 'started_at'], {
        name: 'idx_test_runs_case_started',
        transaction,
      });
      await queryInterface.addIndex(
        'test_case_activity',
        ['workspace_id', 'test_case_id', 'created_at'],
        {
          name: 'idx_test_case_activity_case_created',
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('test_case_activity', { transaction });
      await queryInterface.dropTable('test_result_evidence', { transaction });
      await queryInterface.dropTable('test_results', { transaction });
      await queryInterface.dropTable('test_runs', { transaction });
      await queryInterface.dropTable('test_case_requirements', { transaction });
      await queryInterface.dropTable('test_cases', { transaction });
      await sequelize.query(
        `ALTER TABLE task_attachments DROP CONSTRAINT IF EXISTS uk_task_attachments_workspace_id;`,
        { transaction },
      );
    });
  },
};
