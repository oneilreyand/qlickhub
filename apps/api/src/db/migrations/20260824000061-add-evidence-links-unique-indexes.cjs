'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Preserve historical duplicate evidence rows for recovery/audit. The earliest row
      // remains canonical; duplicate rows are explicitly marked and excluded from the
      // partial unique index instead of being deleted.
      await sequelize.query(
        `ALTER TABLE test_result_evidence_links
           ADD COLUMN IF NOT EXISTS deduplicated_at TIMESTAMPTZ NULL,
           ADD COLUMN IF NOT EXISTS canonical_evidence_link_id UUID NULL;`,
        { transaction },
      );
      await sequelize.query(
        `WITH ranked AS (
           SELECT id,
                  ROW_NUMBER() OVER (
                    PARTITION BY workspace_id, test_result_id, normalized_url
                    ORDER BY added_at ASC, id ASC
                  ) AS row_num,
                  FIRST_VALUE(id) OVER (
                    PARTITION BY workspace_id, test_result_id, normalized_url
                    ORDER BY added_at ASC, id ASC
                  ) AS canonical_id
           FROM test_result_evidence_links
         )
         UPDATE test_result_evidence_links evidence
            SET deduplicated_at = COALESCE(evidence.deduplicated_at, NOW()),
                canonical_evidence_link_id = ranked.canonical_id
           FROM ranked
          WHERE evidence.id = ranked.id
            AND ranked.row_num > 1;`,
        { transaction },
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_test_result_evidence_links_unique_url
           ON test_result_evidence_links (workspace_id, test_result_id, normalized_url)
           WHERE deduplicated_at IS NULL;`,
        { transaction },
      );

      await sequelize.query(
        `ALTER TABLE bug_evidence_links
           ADD COLUMN IF NOT EXISTS deduplicated_at TIMESTAMPTZ NULL,
           ADD COLUMN IF NOT EXISTS canonical_evidence_link_id UUID NULL;`,
        { transaction },
      );
      await sequelize.query(
        `WITH ranked AS (
           SELECT id,
                  ROW_NUMBER() OVER (
                    PARTITION BY workspace_id, bug_id, normalized_url
                    ORDER BY added_at ASC, id ASC
                  ) AS row_num,
                  FIRST_VALUE(id) OVER (
                    PARTITION BY workspace_id, bug_id, normalized_url
                    ORDER BY added_at ASC, id ASC
                  ) AS canonical_id
           FROM bug_evidence_links
         )
         UPDATE bug_evidence_links evidence
            SET deduplicated_at = COALESCE(evidence.deduplicated_at, NOW()),
                canonical_evidence_link_id = ranked.canonical_id
           FROM ranked
          WHERE evidence.id = ranked.id
            AND ranked.row_num > 1;`,
        { transaction },
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_bug_evidence_links_unique_url
           ON bug_evidence_links (workspace_id, bug_id, normalized_url)
           WHERE deduplicated_at IS NULL;`,
        { transaction },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP INDEX IF EXISTS idx_test_result_evidence_links_unique_url;`, {
        transaction,
      });
      await sequelize.query(`DROP INDEX IF EXISTS idx_bug_evidence_links_unique_url;`, {
        transaction,
      });
      await sequelize.query(
        `ALTER TABLE test_result_evidence_links
           DROP COLUMN IF EXISTS canonical_evidence_link_id,
           DROP COLUMN IF EXISTS deduplicated_at;`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE bug_evidence_links
           DROP COLUMN IF EXISTS canonical_evidence_link_id,
           DROP COLUMN IF EXISTS deduplicated_at;`,
        { transaction },
      );
    });
  },
};
