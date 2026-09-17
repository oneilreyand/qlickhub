'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'bug_evidence_links',
        'evidence_stage',
        { type: Sequelize.STRING(24), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'bug_evidence_links',
        'resolution_event_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'test_runs',
        'retest_bug_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'test_runs',
        'retest_resolution_event_id',
        { type: Sequelize.UUID, allowNull: true },
        { transaction },
      );

      await sequelize.query(
        `UPDATE bug_evidence_links AS evidence
            SET evidence_stage = CASE
              WHEN EXISTS (
                SELECT 1
                  FROM bug_activities AS activity
                 WHERE activity.workspace_id = evidence.workspace_id
                   AND activity.bug_id = evidence.bug_id
                   AND activity.metadata_json ->> 'evidenceLinkId' = evidence.id::text
                   AND activity.metadata_json ->> 'kind' = 'triage'
              ) THEN 'triage'
              ELSE 'legacy_unassigned'
            END;

         ALTER TABLE bug_evidence_links
           ALTER COLUMN evidence_stage SET NOT NULL,
           ALTER COLUMN evidence_stage SET DEFAULT 'triage';

         ALTER TABLE bug_resolution_events
           ADD CONSTRAINT uk_bug_resolution_events_workspace_bug_id
             UNIQUE (workspace_id, bug_id, id);

         ALTER TABLE bug_evidence_links
           ADD CONSTRAINT fk_bug_evidence_resolution_event
             FOREIGN KEY (workspace_id, bug_id, resolution_event_id)
             REFERENCES bug_resolution_events(workspace_id, bug_id, id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_bug_evidence_stage_resolution CHECK (
             (evidence_stage = 'triage' AND resolution_event_id IS NULL)
             OR (evidence_stage = 'resolution' AND resolution_event_id IS NOT NULL)
             OR (evidence_stage = 'legacy_unassigned' AND resolution_event_id IS NULL)
           );

         ALTER TABLE test_runs
           ADD CONSTRAINT fk_test_runs_retest_bug
             FOREIGN KEY (workspace_id, retest_bug_id)
             REFERENCES bugs(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT fk_test_runs_retest_resolution_event
             FOREIGN KEY (workspace_id, retest_bug_id, retest_resolution_event_id)
             REFERENCES bug_resolution_events(workspace_id, bug_id, id)
             ON DELETE RESTRICT ON UPDATE CASCADE,
           ADD CONSTRAINT ck_test_runs_retest_scope CHECK (
             (retest_bug_id IS NULL AND retest_resolution_event_id IS NULL)
             OR (retest_bug_id IS NOT NULL AND retest_resolution_event_id IS NOT NULL)
           ),
           ADD CONSTRAINT uk_test_runs_retest_resolution_event
             UNIQUE (workspace_id, retest_resolution_event_id);`,
        { transaction },
      );

      await queryInterface.addIndex(
        'bug_evidence_links',
        ['workspace_id', 'bug_id', 'resolution_event_id', 'added_at'],
        { name: 'idx_bug_evidence_resolution_timeline', transaction },
      );
      await queryInterface.addIndex(
        'test_runs',
        ['workspace_id', 'retest_bug_id', 'retest_resolution_event_id'],
        { name: 'idx_test_runs_contextual_retest', transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('test_runs', 'idx_test_runs_contextual_retest', {
        transaction,
      });
      await queryInterface.removeIndex(
        'bug_evidence_links',
        'idx_bug_evidence_resolution_timeline',
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE test_runs
           DROP CONSTRAINT IF EXISTS uk_test_runs_retest_resolution_event,
           DROP CONSTRAINT IF EXISTS ck_test_runs_retest_scope,
           DROP CONSTRAINT IF EXISTS fk_test_runs_retest_resolution_event,
           DROP CONSTRAINT IF EXISTS fk_test_runs_retest_bug;

         ALTER TABLE bug_evidence_links
           DROP CONSTRAINT IF EXISTS ck_bug_evidence_stage_resolution,
           DROP CONSTRAINT IF EXISTS fk_bug_evidence_resolution_event;

         ALTER TABLE bug_resolution_events
           DROP CONSTRAINT IF EXISTS uk_bug_resolution_events_workspace_bug_id;`,
        { transaction },
      );

      await queryInterface.removeColumn('test_runs', 'retest_resolution_event_id', { transaction });
      await queryInterface.removeColumn('test_runs', 'retest_bug_id', { transaction });
      await queryInterface.removeColumn('bug_evidence_links', 'resolution_event_id', {
        transaction,
      });
      await queryInterface.removeColumn('bug_evidence_links', 'evidence_stage', { transaction });
    });
  },
};
