'use strict';

/**
 * MEMBER-ACCESS-HUB P4 (ADR-046): reusable sets of Workspace + role + specialties owned by one
 * Owner/Admin. Entries are re-validated whenever the template is used; the table holds no grant.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS member_role_templates (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           name VARCHAR(60) NOT NULL,
           entries JSONB NOT NULL DEFAULT '[]'::jsonb,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT member_role_templates_name_not_blank CHECK (length(btrim(name)) > 0),
           CONSTRAINT member_role_templates_entries_array CHECK (jsonb_typeof(entries) = 'array')
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_member_role_templates_owner_name
           ON member_role_templates (owner_user_id, lower(name));`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS member_role_templates;');
  },
};
