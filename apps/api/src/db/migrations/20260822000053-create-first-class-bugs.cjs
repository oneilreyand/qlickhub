'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'bugs',
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
          test_result_id: { type: Sequelize.UUID, allowNull: false },
          assignee_id: { type: Sequelize.UUID, allowNull: false },
          title: { type: Sequelize.STRING(255), allowNull: false },
          severity: { type: Sequelize.STRING(32), allowNull: false },
          status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'open' },
          reproduction_details: { type: Sequelize.TEXT, allowNull: false },
          resolution_notes: { type: Sequelize.TEXT, allowNull: true },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          resolved_at: { type: Sequelize.DATE, allowNull: true },
          verified_at: { type: Sequelize.DATE, allowNull: true },
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
        `ALTER TABLE bugs
         ADD CONSTRAINT uk_bugs_workspace_id UNIQUE (workspace_id, id),
         ADD CONSTRAINT fk_bugs_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bugs_feature_task FOREIGN KEY (feature_task_id, workspace_id)
           REFERENCES tasks(id, workspace_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bugs_requirement FOREIGN KEY (workspace_id, requirement_id)
           REFERENCES requirements(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bugs_test_result FOREIGN KEY (workspace_id, test_result_id)
           REFERENCES test_results(workspace_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bugs_assignee_membership FOREIGN KEY (workspace_id, assignee_id)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bugs_creator_membership FOREIGN KEY (workspace_id, created_by)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_bugs_title_not_blank CHECK (length(btrim(title)) > 0),
         ADD CONSTRAINT ck_bugs_reproduction_not_blank CHECK (length(btrim(reproduction_details)) > 0),
         ADD CONSTRAINT ck_bugs_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
         ADD CONSTRAINT ck_bugs_status CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'reopened')),
         ADD CONSTRAINT ck_bugs_lifecycle_timestamps CHECK (
           (status IN ('open', 'in_progress', 'reopened') AND resolved_at IS NULL AND verified_at IS NULL)
           OR (status = 'resolved' AND resolved_at IS NOT NULL AND verified_at IS NULL)
           OR (status = 'verified' AND resolved_at IS NOT NULL AND verified_at IS NOT NULL)
         );`,
        { transaction },
      );

      await queryInterface.createTable(
        'bug_activities',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          bug_id: { type: Sequelize.UUID, allowNull: false },
          actor_id: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          action: { type: Sequelize.STRING(100), allowNull: false },
          from_status: { type: Sequelize.STRING(32), allowNull: true },
          to_status: { type: Sequelize.STRING(32), allowNull: true },
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
        `ALTER TABLE bug_activities
         ADD CONSTRAINT fk_bug_activities_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bug_activities_bug FOREIGN KEY (workspace_id, bug_id)
           REFERENCES bugs(workspace_id, id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_bug_activities_actor_membership FOREIGN KEY (workspace_id, actor_id)
           REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_bug_activities_action CHECK (
           action IN ('bug_created', 'bug_assigned', 'bug_updated', 'bug_work_started', 'bug_resolved', 'bug_reopened', 'bug_verified')
         ),
         ADD CONSTRAINT ck_bug_activities_from_status CHECK (
           from_status IS NULL OR from_status IN ('open', 'in_progress', 'resolved', 'verified', 'reopened')
         ),
         ADD CONSTRAINT ck_bug_activities_to_status CHECK (
           to_status IS NULL OR to_status IN ('open', 'in_progress', 'resolved', 'verified', 'reopened')
         );`,
        { transaction },
      );

      await queryInterface.addIndex('bugs', ['workspace_id', 'feature_task_id', 'status'], {
        name: 'idx_bugs_feature_status',
        transaction,
      });
      await queryInterface.addIndex('bugs', ['workspace_id', 'requirement_id'], {
        name: 'idx_bugs_requirement',
        transaction,
      });
      await queryInterface.addIndex('bugs', ['workspace_id', 'test_result_id'], {
        name: 'idx_bugs_test_result',
        transaction,
      });
      await queryInterface.addIndex('bugs', ['workspace_id', 'assignee_id', 'status'], {
        name: 'idx_bugs_assignee_status',
        transaction,
      });
      await queryInterface.addIndex('bug_activities', ['workspace_id', 'bug_id', 'created_at'], {
        name: 'idx_bug_activities_bug_created',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('bug_activities', { transaction });
      await queryInterface.dropTable('bugs', { transaction });
    });
  },
};
