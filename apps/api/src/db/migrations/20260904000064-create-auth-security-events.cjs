'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'auth_security_events',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          event_type: {
            type: Sequelize.STRING(40),
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'workspaces', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          actor_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          subject_user_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          metadata_json: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE auth_security_events
           ADD CONSTRAINT ck_auth_security_events_type
             CHECK (event_type IN ('password_reset_completed', 'password_changed', 'member_password_reset')),
           ADD CONSTRAINT ck_auth_security_events_metadata_object
             CHECK (jsonb_typeof(metadata_json) = 'object'),
           ADD CONSTRAINT ck_auth_security_events_metadata_shape
             CHECK (
               (
                 event_type IN ('password_reset_completed', 'password_changed')
                 AND metadata_json ? 'revokedSessionCount'
                 AND (metadata_json - 'revokedSessionCount') = '{}'::jsonb
                 AND jsonb_typeof(metadata_json -> 'revokedSessionCount') = 'number'
                 AND (metadata_json ->> 'revokedSessionCount') ~ '^[0-9]+$'
               )
               OR (
                 event_type = 'member_password_reset'
                 AND metadata_json ?& ARRAY['revokedSessionCount', 'actorWorkspaceRole', 'targetWorkspaceRole']
                 AND (metadata_json - ARRAY['revokedSessionCount', 'actorWorkspaceRole', 'targetWorkspaceRole']) = '{}'::jsonb
                 AND jsonb_typeof(metadata_json -> 'revokedSessionCount') = 'number'
                 AND (metadata_json ->> 'revokedSessionCount') ~ '^[0-9]+$'
                 AND COALESCE(metadata_json ->> 'actorWorkspaceRole' IN ('owner', 'admin'), false)
                 AND COALESCE(metadata_json ->> 'targetWorkspaceRole' IN ('owner', 'admin', 'po', 'dev', 'qa'), false)
               )
             ),
           ADD CONSTRAINT ck_auth_security_events_identity
             CHECK (
               (event_type = 'password_reset_completed' AND workspace_id IS NULL AND actor_id IS NULL AND subject_user_id IS NOT NULL)
               OR (event_type = 'password_changed' AND workspace_id IS NULL AND actor_id IS NOT NULL AND subject_user_id IS NOT NULL AND actor_id = subject_user_id)
               OR (event_type = 'member_password_reset' AND workspace_id IS NOT NULL AND actor_id IS NOT NULL AND subject_user_id IS NOT NULL AND actor_id <> subject_user_id)
             );`,
        { transaction },
      );

      await queryInterface.addIndex('auth_security_events', ['subject_user_id', 'created_at'], {
        name: 'idx_auth_security_events_subject_created',
        transaction,
      });
      await queryInterface.addIndex('auth_security_events', ['actor_id', 'created_at'], {
        name: 'idx_auth_security_events_actor_created',
        transaction,
      });
      await queryInterface.addIndex('auth_security_events', ['workspace_id', 'created_at'], {
        name: 'idx_auth_security_events_workspace_created',
        transaction,
      });

      await sequelize.query(
        `CREATE FUNCTION prevent_auth_security_event_update()
         RETURNS trigger AS $$
         BEGIN
           RAISE EXCEPTION 'Authentication security events are append-only and cannot be updated';
         END;
         $$ LANGUAGE plpgsql;
         CREATE TRIGGER trg_auth_security_events_immutable
           BEFORE UPDATE ON auth_security_events
           FOR EACH ROW EXECUTE FUNCTION prevent_auth_security_event_update();`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('auth_security_events', { transaction });
      await sequelize.query('DROP FUNCTION IF EXISTS prevent_auth_security_event_update();', {
        transaction,
      });
    });
  },
};
