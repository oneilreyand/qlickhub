'use strict';
module.exports = {
  async up(q, S) {
    const { sequelize } = q;
    await sequelize.transaction(async (transaction) => {
      await q.createTable(
        'bug_resolution_events',
        {
          id: { type: S.UUID, defaultValue: S.literal('gen_random_uuid()'), primaryKey: true },
          workspace_id: { type: S.UUID, allowNull: false },
          bug_id: { type: S.UUID, allowNull: false },
          sequence: { type: S.INTEGER, allowNull: false },
          candidate_fingerprint: { type: S.STRING(255), allowNull: false },
          resolution_notes: { type: S.TEXT, allowNull: false },
          resolved_by: { type: S.UUID, allowNull: false },
          created_at: {
            type: S.DATE,
            allowNull: false,
            defaultValue: S.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );
      await q.createTable(
        'bug_retest_attempts',
        {
          id: { type: S.UUID, defaultValue: S.literal('gen_random_uuid()'), primaryKey: true },
          workspace_id: { type: S.UUID, allowNull: false },
          bug_id: { type: S.UUID, allowNull: false },
          resolution_event_id: { type: S.UUID, allowNull: false },
          test_result_id: { type: S.UUID, allowNull: false },
          outcome: { type: S.STRING(16), allowNull: false },
          attempted_by: { type: S.UUID, allowNull: false },
          created_at: {
            type: S.DATE,
            allowNull: false,
            defaultValue: S.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE bug_resolution_events ADD CONSTRAINT fk_bre_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE, ADD CONSTRAINT fk_bre_bug FOREIGN KEY(bug_id) REFERENCES bugs(id) ON DELETE CASCADE, ADD CONSTRAINT fk_bre_actor FOREIGN KEY(resolved_by) REFERENCES users(id) ON DELETE RESTRICT, ADD CONSTRAINT uk_bre_sequence UNIQUE(bug_id,sequence), ADD CONSTRAINT ck_bre_candidate CHECK(length(btrim(candidate_fingerprint))>0), ADD CONSTRAINT ck_bre_notes CHECK(length(btrim(resolution_notes))>0); ALTER TABLE bug_retest_attempts ADD CONSTRAINT fk_bra_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE, ADD CONSTRAINT fk_bra_bug FOREIGN KEY(bug_id) REFERENCES bugs(id) ON DELETE CASCADE, ADD CONSTRAINT fk_bra_resolution FOREIGN KEY(resolution_event_id) REFERENCES bug_resolution_events(id) ON DELETE RESTRICT, ADD CONSTRAINT fk_bra_result FOREIGN KEY(test_result_id) REFERENCES test_results(id) ON DELETE RESTRICT, ADD CONSTRAINT fk_bra_actor FOREIGN KEY(attempted_by) REFERENCES users(id) ON DELETE RESTRICT, ADD CONSTRAINT uk_bra_result UNIQUE(test_result_id), ADD CONSTRAINT uk_bra_resolution UNIQUE(resolution_event_id), ADD CONSTRAINT ck_bra_outcome CHECK(outcome IN ('verified','reopened'));`,
        { transaction },
      );
      await q.addIndex('bug_resolution_events', ['workspace_id', 'bug_id', 'sequence'], {
        transaction,
      });
      await q.addIndex('bug_retest_attempts', ['workspace_id', 'bug_id', 'created_at'], {
        transaction,
      });
    });
  },
  async down(q) {
    await q.dropTable('bug_retest_attempts');
    await q.dropTable('bug_resolution_events');
  },
};
