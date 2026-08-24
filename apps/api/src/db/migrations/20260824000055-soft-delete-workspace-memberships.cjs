'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'workspace_members',
        'deleted_at',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.createTable(
        'workspace_membership_activity',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          actor_id: { type: Sequelize.UUID, allowNull: false },
          target_user_id: { type: Sequelize.UUID, allowNull: false },
          action: { type: Sequelize.STRING(32), allowNull: false },
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
        `ALTER TABLE workspace_membership_activity
         ADD CONSTRAINT fk_workspace_membership_activity_workspace FOREIGN KEY (workspace_id)
           REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD CONSTRAINT fk_workspace_membership_activity_actor FOREIGN KEY (actor_id)
           REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT fk_workspace_membership_activity_target FOREIGN KEY (target_user_id)
           REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
         ADD CONSTRAINT ck_workspace_membership_activity_action
           CHECK (action IN ('member_removed', 'member_restored')),
         ADD CONSTRAINT ck_workspace_membership_activity_metadata_object
           CHECK (metadata_json IS NULL OR jsonb_typeof(metadata_json) = 'object');`,
        { transaction },
      );

      await queryInterface.addIndex(
        'workspace_membership_activity',
        ['workspace_id', 'created_at'],
        { name: 'idx_workspace_membership_activity_workspace_created', transaction },
      );
      await queryInterface.addIndex('workspace_members', ['workspace_id', 'deleted_at'], {
        name: 'idx_workspace_members_active',
        transaction,
      });

      await sequelize.query(
        `CREATE FUNCTION enforce_active_workspace_assignee()
         RETURNS trigger AS $$
         BEGIN
           IF NEW.assignee_id IS NULL THEN
             RETURN NEW;
           END IF;

           PERFORM 1
           FROM workspace_members
           WHERE workspace_id = NEW.workspace_id
             AND user_id = NEW.assignee_id
             AND deleted_at IS NULL
           FOR KEY SHARE;

           IF NOT FOUND THEN
             RAISE EXCEPTION 'Assignee must be an active member of the workspace'
               USING ERRCODE = '23503';
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;

         CREATE TRIGGER trg_tasks_active_workspace_assignee
           BEFORE INSERT OR UPDATE OF workspace_id, assignee_id ON tasks
           FOR EACH ROW EXECUTE FUNCTION enforce_active_workspace_assignee();

         CREATE TRIGGER trg_bugs_active_workspace_assignee
           BEFORE INSERT OR UPDATE OF workspace_id, assignee_id ON bugs
           FOR EACH ROW EXECUTE FUNCTION enforce_active_workspace_assignee();`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP TRIGGER IF EXISTS trg_bugs_active_workspace_assignee ON bugs;', {
        transaction,
      });
      await sequelize.query(
        'DROP TRIGGER IF EXISTS trg_tasks_active_workspace_assignee ON tasks;',
        { transaction },
      );
      await sequelize.query('DROP FUNCTION IF EXISTS enforce_active_workspace_assignee();', {
        transaction,
      });
      await queryInterface.dropTable('workspace_membership_activity', { transaction });
      await queryInterface.removeIndex('workspace_members', 'idx_workspace_members_active', {
        transaction,
      });
      await queryInterface.removeColumn('workspace_members', 'deleted_at', { transaction });
    });
  },
};
