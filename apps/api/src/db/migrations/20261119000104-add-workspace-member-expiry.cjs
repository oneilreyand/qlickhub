'use strict';

/**
 * MEMBER-ACCESS-HUB P5 (ADR-046): time-bound Workspace membership. A membership whose
 * `expires_at` has passed is inactive for AUTH-001 on every request; the scheduled job only
 * records `membership_expired`. Additive: existing rows keep `expires_at = NULL` (no limit).
 */
const ACTIONS_BEFORE = [
  'member_added',
  'member_removed',
  'member_restored',
  'member_role_updated',
  'member_specialties_updated',
  'workspace_archived',
  'workspace_restored',
];
const ACTIONS_AFTER = [...ACTIONS_BEFORE, 'member_expiry_updated', 'membership_expired'];
const check = (actions) =>
  `ALTER TABLE workspace_membership_activity
     DROP CONSTRAINT IF EXISTS ck_workspace_membership_activity_action,
     ADD CONSTRAINT ck_workspace_membership_activity_action
       CHECK (action IN (${actions.map((a) => `'${a}'`).join(', ')}));`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_workspace_members_expires_at
           ON workspace_members (expires_at)
           WHERE expires_at IS NOT NULL AND deleted_at IS NULL;`,
        { transaction },
      );
      await sequelize.query(check(ACTIONS_AFTER), { transaction });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `DELETE FROM workspace_membership_activity
           WHERE action IN ('member_expiry_updated', 'membership_expired');`,
        { transaction },
      );
      await sequelize.query(check(ACTIONS_BEFORE), { transaction });
      await sequelize.query('DROP INDEX IF EXISTS idx_workspace_members_expires_at;', {
        transaction,
      });
      await sequelize.query('ALTER TABLE workspace_members DROP COLUMN IF EXISTS expires_at;', {
        transaction,
      });
    });
  },
};
