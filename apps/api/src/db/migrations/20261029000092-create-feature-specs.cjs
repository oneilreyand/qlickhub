'use strict';

/**
 * P5a (ADR-036, AC-5.1 to AC-5.3, AC-5.7): Feature Spec, one versioned specification per root
 * Feature with Plan, PRD, and Task sections. Tables are new and additive; no existing data changes.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS feature_specs (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           workspace_id UUID NOT NULL
             REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           feature_task_id UUID NOT NULL UNIQUE
             REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
           version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
           status TEXT NOT NULL DEFAULT 'plan'
             CHECK (status IN ('plan', 'prd', 'task', 'applied')),
           plan JSONB NOT NULL DEFAULT '{}'::jsonb,
           prd JSONB NOT NULL DEFAULT '{}'::jsonb,
           tasks JSONB NOT NULL DEFAULT '{}'::jsonb,
           apply_fingerprint TEXT UNIQUE,
           created_by UUID NOT NULL
             REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           updated_by UUID NOT NULL
             REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_feature_specs_workspace
           ON feature_specs (workspace_id, updated_at DESC);`,
        { transaction },
      );
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS feature_spec_versions (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           spec_id UUID NOT NULL
             REFERENCES feature_specs(id) ON DELETE CASCADE ON UPDATE CASCADE,
           workspace_id UUID NOT NULL
             REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
           version INTEGER NOT NULL CHECK (version >= 1),
           snapshot JSONB NOT NULL,
           actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent')),
           actor_id UUID,
           via TEXT NOT NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           UNIQUE (spec_id, version)
         );`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS feature_spec_versions;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS feature_specs;');
  },
};
