'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'requirement_findings',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          feature_task_id: { type: Sequelize.UUID, allowNull: false },
          requirement_id: { type: Sequelize.UUID, allowNull: false },
          requirement_code: { type: Sequelize.STRING(50), allowNull: false },
          requirement_title: { type: Sequelize.STRING(255), allowNull: false },
          requirement_status: { type: Sequelize.STRING(50), allowNull: false },
          category: { type: Sequelize.STRING(48), allowNull: false },
          severity: { type: Sequelize.STRING(16), allowNull: false },
          summary: { type: Sequelize.STRING(255), allowNull: false },
          details: { type: Sequelize.TEXT, allowNull: false },
          proposed_cause: { type: Sequelize.STRING(48), allowNull: false },
          reporter_group: { type: Sequelize.STRING(24), allowNull: false },
          reported_by: { type: Sequelize.UUID, allowNull: false },
          reported_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE requirement_findings
         ADD CONSTRAINT uk_requirement_findings_scope_id
           UNIQUE (workspace_id, feature_task_id, id),
         ADD CONSTRAINT uk_requirement_findings_workspace_id
           UNIQUE (workspace_id, id),
         ADD CONSTRAINT fk_requirement_findings_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_findings_feature FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_findings_requirement FOREIGN KEY (workspace_id, requirement_id)
           REFERENCES requirements(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_findings_reporter FOREIGN KEY (workspace_id, reported_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_requirement_findings_category CHECK (category IN (
           'missing_flow', 'ambiguous_rule', 'missing_acceptance_criteria',
           'role_or_permission_gap', 'data_or_edge_case_gap', 'non_functional_gap',
           'dependency_gap', 'other'
         )),
         ADD CONSTRAINT ck_requirement_findings_severity
           CHECK (severity IN ('critical', 'high', 'medium', 'low')),
         ADD CONSTRAINT ck_requirement_findings_summary
           CHECK (length(btrim(summary)) BETWEEN 1 AND 255),
         ADD CONSTRAINT ck_requirement_findings_details
           CHECK (length(btrim(details)) BETWEEN 1 AND 10000),
         ADD CONSTRAINT ck_requirement_findings_proposed_cause CHECK (proposed_cause IN (
           'requirement_definition', 'technical_feasibility', 'testability',
           'scope_change', 'shared', 'unknown'
         )),
         ADD CONSTRAINT ck_requirement_findings_reporter_group
           CHECK (reporter_group IN ('product', 'development', 'qa')),
         ADD CONSTRAINT ck_requirement_findings_requirement_snapshot
           CHECK (
             length(btrim(requirement_code)) BETWEEN 1 AND 50
             AND length(btrim(requirement_title)) BETWEEN 1 AND 255
             AND requirement_status IN ('draft', 'active', 'deprecated')
           );`,
        { transaction },
      );

      await queryInterface.createTable(
        'requirement_finding_clarifications',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          finding_id: { type: Sequelize.UUID, allowNull: false },
          message: { type: Sequelize.TEXT, allowNull: false },
          author_group: { type: Sequelize.STRING(24), allowNull: false },
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
        `ALTER TABLE requirement_finding_clarifications
         ADD CONSTRAINT fk_requirement_finding_clarifications_finding
           FOREIGN KEY (workspace_id, finding_id)
           REFERENCES requirement_findings(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_finding_clarifications_author
           FOREIGN KEY (workspace_id, created_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_requirement_finding_clarifications_message
           CHECK (length(btrim(message)) BETWEEN 1 AND 10000),
         ADD CONSTRAINT ck_requirement_finding_clarifications_group
           CHECK (author_group IN ('product', 'development', 'qa'));`,
        { transaction },
      );

      await queryInterface.createTable(
        'requirement_finding_triage_positions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          finding_id: { type: Sequelize.UUID, allowNull: false },
          participant_group: { type: Sequelize.STRING(24), allowNull: false },
          classification: { type: Sequelize.STRING(48), allowNull: false },
          rationale: { type: Sequelize.TEXT, allowNull: false },
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
        `ALTER TABLE requirement_finding_triage_positions
         ADD CONSTRAINT fk_requirement_finding_triage_positions_finding
           FOREIGN KEY (workspace_id, finding_id)
           REFERENCES requirement_findings(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_finding_triage_positions_actor
           FOREIGN KEY (workspace_id, created_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_requirement_finding_triage_positions_group
           CHECK (participant_group IN ('product', 'development', 'qa')),
         ADD CONSTRAINT ck_requirement_finding_triage_positions_classification CHECK (classification IN (
           'requirement_definition', 'technical_feasibility', 'testability',
           'scope_change', 'shared', 'unknown'
         )),
         ADD CONSTRAINT ck_requirement_finding_triage_positions_rationale
           CHECK (length(btrim(rationale)) BETWEEN 1 AND 10000);`,
        { transaction },
      );

      await queryInterface.createTable(
        'requirement_finding_triage_decisions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          finding_id: { type: Sequelize.UUID, allowNull: false },
          version: { type: Sequelize.INTEGER, allowNull: false },
          classification: { type: Sequelize.STRING(48), allowNull: false },
          mode: { type: Sequelize.STRING(24), allowNull: false },
          rationale: { type: Sequelize.TEXT, allowNull: false },
          position_ids_json: { type: Sequelize.JSONB, allowNull: false },
          supersedes_decision_id: { type: Sequelize.UUID, allowNull: true },
          recorded_by: { type: Sequelize.UUID, allowNull: false },
          recorded_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE requirement_finding_triage_decisions
         ADD CONSTRAINT uk_requirement_finding_triage_decisions_scope_id
           UNIQUE (workspace_id, finding_id, id),
         ADD CONSTRAINT uk_requirement_finding_triage_decisions_version
           UNIQUE (workspace_id, finding_id, version),
         ADD CONSTRAINT fk_requirement_finding_triage_decisions_finding
           FOREIGN KEY (workspace_id, finding_id)
           REFERENCES requirement_findings(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_finding_triage_decisions_previous
           FOREIGN KEY (workspace_id, finding_id, supersedes_decision_id)
           REFERENCES requirement_finding_triage_decisions(workspace_id, finding_id, id)
           ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_finding_triage_decisions_actor
           FOREIGN KEY (workspace_id, recorded_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_requirement_finding_triage_decisions_version CHECK (version > 0),
         ADD CONSTRAINT ck_requirement_finding_triage_decisions_classification CHECK (classification IN (
           'requirement_definition', 'technical_feasibility', 'testability',
           'scope_change', 'shared', 'unknown'
         )),
         ADD CONSTRAINT ck_requirement_finding_triage_decisions_mode
           CHECK (mode IN ('consensus', 'governance')),
         ADD CONSTRAINT ck_requirement_finding_triage_decisions_rationale
           CHECK (length(btrim(rationale)) BETWEEN 1 AND 10000),
         ADD CONSTRAINT ck_requirement_finding_triage_decisions_positions
           CHECK (jsonb_typeof(position_ids_json) = 'object');`,
        { transaction },
      );

      await queryInterface.createTable(
        'requirement_finding_status_events',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          finding_id: { type: Sequelize.UUID, allowNull: false },
          action: { type: Sequelize.STRING(16), allowNull: false },
          reason: { type: Sequelize.TEXT, allowNull: false },
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
        `ALTER TABLE requirement_finding_status_events
         ADD CONSTRAINT fk_requirement_finding_status_events_finding
           FOREIGN KEY (workspace_id, finding_id)
           REFERENCES requirement_findings(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_requirement_finding_status_events_actor
           FOREIGN KEY (workspace_id, created_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_requirement_finding_status_events_action
           CHECK (action IN ('resolved', 'reopened')),
         ADD CONSTRAINT ck_requirement_finding_status_events_reason
           CHECK (length(btrim(reason)) BETWEEN 1 AND 10000);`,
        { transaction },
      );

      await queryInterface.addIndex(
        'requirement_findings',
        ['workspace_id', 'feature_task_id', 'reported_at'],
        { name: 'idx_requirement_findings_feature', transaction },
      );
      await queryInterface.addIndex('requirement_findings', ['workspace_id', 'requirement_id'], {
        name: 'idx_requirement_findings_requirement',
        transaction,
      });
      await queryInterface.addIndex(
        'requirement_finding_clarifications',
        ['workspace_id', 'finding_id', 'created_at'],
        { name: 'idx_requirement_finding_clarifications_history', transaction },
      );
      await queryInterface.addIndex(
        'requirement_finding_triage_positions',
        ['workspace_id', 'finding_id', 'participant_group', 'created_at'],
        { name: 'idx_requirement_finding_triage_positions_latest', transaction },
      );
      await queryInterface.addIndex(
        'requirement_finding_status_events',
        ['workspace_id', 'finding_id', 'created_at'],
        { name: 'idx_requirement_finding_status_events_latest', transaction },
      );

      await sequelize.query(
        `CREATE TRIGGER trg_requirement_findings_immutable
           BEFORE UPDATE ON requirement_findings
           FOR EACH ROW EXECUTE FUNCTION prevent_feature_readiness_update();
         CREATE TRIGGER trg_requirement_finding_clarifications_immutable
           BEFORE UPDATE ON requirement_finding_clarifications
           FOR EACH ROW EXECUTE FUNCTION prevent_feature_readiness_update();
         CREATE TRIGGER trg_requirement_finding_triage_positions_immutable
           BEFORE UPDATE ON requirement_finding_triage_positions
           FOR EACH ROW EXECUTE FUNCTION prevent_feature_readiness_update();
         CREATE TRIGGER trg_requirement_finding_triage_decisions_immutable
           BEFORE UPDATE ON requirement_finding_triage_decisions
           FOR EACH ROW EXECUTE FUNCTION prevent_feature_readiness_update();
         CREATE TRIGGER trg_requirement_finding_status_events_immutable
           BEFORE UPDATE ON requirement_finding_status_events
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
             OR EXISTS (SELECT 1 FROM requirement_findings WHERE workspace_id = OLD.workspace_id AND feature_task_id = OLD.id)
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

      await queryInterface.dropTable('requirement_finding_status_events', { transaction });
      await queryInterface.dropTable('requirement_finding_triage_decisions', { transaction });
      await queryInterface.dropTable('requirement_finding_triage_positions', { transaction });
      await queryInterface.dropTable('requirement_finding_clarifications', { transaction });
      await queryInterface.dropTable('requirement_findings', { transaction });
    });
  },
};
