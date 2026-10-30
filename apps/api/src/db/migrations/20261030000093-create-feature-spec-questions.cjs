'use strict';

/**
 * P5b (ADR-036, AC-5.4): clarifying questions the AI asks about a Feature idea, and the answers.
 * The table is new and additive; no existing data changes.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS feature_spec_questions (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           spec_id UUID NOT NULL
             REFERENCES feature_specs(id) ON DELETE CASCADE ON UPDATE CASCADE,
           workspace_id UUID NOT NULL
             REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           position INTEGER NOT NULL CHECK (position >= 0),
           text TEXT NOT NULL,
           reason TEXT NOT NULL DEFAULT '',
           required BOOLEAN NOT NULL DEFAULT TRUE,
           answer TEXT,
           answered_by UUID
             REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
           answered_at TIMESTAMPTZ,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_feature_spec_questions_spec
           ON feature_spec_questions (spec_id, position);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS feature_spec_questions;');
  },
};
