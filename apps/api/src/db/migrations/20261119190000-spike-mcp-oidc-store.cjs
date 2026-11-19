'use strict';

/**
 * SPIKE ONLY (branch spike/mcp-oauth, never merged; QLICKHUB-PRODUCT-MCP-SPIKE-OAUTH-HOSTING S3).
 * Key-value storage for the oidc-provider adapter so authorization codes, grants and tokens are
 * shared across Vercel instances in Preview. Applied to the Preview database only and dropped
 * when the spike ends (`down`). Owner decision 2026-11-19.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS mcp_spike_oidc_store (
           model VARCHAR(64) NOT NULL,
           id VARCHAR(512) NOT NULL,
           payload JSONB NOT NULL,
           grant_id VARCHAR(512),
           uid VARCHAR(512),
           user_code VARCHAR(512),
           expires_at TIMESTAMPTZ,
           consumed_at TIMESTAMPTZ,
           PRIMARY KEY (model, id)
         );`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_mcp_spike_oidc_grant ON mcp_spike_oidc_store (grant_id) WHERE grant_id IS NOT NULL;`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_mcp_spike_oidc_uid ON mcp_spike_oidc_store (uid) WHERE uid IS NOT NULL;`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_mcp_spike_oidc_expires ON mcp_spike_oidc_store (expires_at);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS mcp_spike_oidc_store;');
  },
};
