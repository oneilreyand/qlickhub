'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'workspace_member_specialties',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          workspace_id: { type: Sequelize.UUID, allowNull: false },
          workspace_member_id: { type: Sequelize.UUID, allowNull: false },
          specialty: { type: Sequelize.STRING(32), allowNull: false },
          created_by: { type: Sequelize.UUID, allowNull: false },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE workspace_member_specialties
          ADD CONSTRAINT fk_workspace_member_specialties_workspace FOREIGN KEY (workspace_id)
            REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
          ADD CONSTRAINT fk_workspace_member_specialties_member FOREIGN KEY (workspace_member_id)
            REFERENCES workspace_members(id) ON UPDATE CASCADE ON DELETE CASCADE,
          ADD CONSTRAINT fk_workspace_member_specialties_creator FOREIGN KEY (created_by)
            REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          ADD CONSTRAINT ck_workspace_member_specialties_value
            CHECK (specialty IN ('frontend', 'backend', 'mobile', 'fullstack'));

        CREATE OR REPLACE FUNCTION enforce_workspace_member_specialty_integrity()
        RETURNS TRIGGER AS $$
        DECLARE
          v_workspace_id UUID;
          v_role TEXT;
          v_deleted_at TIMESTAMPTZ;
        BEGIN
          SELECT workspace_id, role::text, deleted_at
            INTO v_workspace_id, v_role, v_deleted_at
          FROM workspace_members
          WHERE id = NEW.workspace_member_id;

          IF NOT FOUND OR v_deleted_at IS NOT NULL THEN
            RAISE EXCEPTION 'Developer specialty requires an active Workspace membership';
          END IF;
          IF v_workspace_id <> NEW.workspace_id THEN
            RAISE EXCEPTION 'Developer specialty Workspace must match its membership';
          END IF;
          IF v_role <> 'dev' THEN
            RAISE EXCEPTION 'Developer specialties are allowed only for the dev role';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_workspace_member_specialty_integrity
          BEFORE INSERT OR UPDATE ON workspace_member_specialties
          FOR EACH ROW EXECUTE FUNCTION enforce_workspace_member_specialty_integrity();
      `,
        { transaction },
      );

      await queryInterface.addConstraint('workspace_member_specialties', {
        fields: ['workspace_id', 'workspace_member_id', 'specialty'],
        type: 'unique',
        name: 'uq_workspace_member_specialties_member_area',
        transaction,
      });
      await queryInterface.addIndex('workspace_member_specialties', ['workspace_id', 'specialty'], {
        name: 'idx_workspace_member_specialties_workspace_area',
        transaction,
      });

      await queryInterface.sequelize.query(
        `
        ALTER TABLE workspace_membership_activity
          DROP CONSTRAINT IF EXISTS ck_workspace_membership_activity_action,
          ADD CONSTRAINT ck_workspace_membership_activity_action
            CHECK (action IN ('member_removed', 'member_restored', 'member_role_updated', 'member_specialties_updated'));
      `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        ALTER TABLE workspace_membership_activity
          DROP CONSTRAINT IF EXISTS ck_workspace_membership_activity_action,
          ADD CONSTRAINT ck_workspace_membership_activity_action
            CHECK (action IN ('member_removed', 'member_restored'));
        DROP TRIGGER IF EXISTS trg_workspace_member_specialty_integrity ON workspace_member_specialties;
        DROP FUNCTION IF EXISTS enforce_workspace_member_specialty_integrity();
      `,
        { transaction },
      );
      await queryInterface.dropTable('workspace_member_specialties', { transaction });
    });
  },
};
