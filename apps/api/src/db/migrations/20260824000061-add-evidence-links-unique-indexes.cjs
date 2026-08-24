'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Deterministically deduplicate test_result_evidence_links keeping earliest row (added_at ASC, id ASC)
      await sequelize.query(
        `DELETE FROM test_result_evidence_links
         WHERE id IN (
           SELECT id FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY workspace_id, test_result_id, normalized_url
                      ORDER BY added_at ASC, id ASC
                    ) as row_num
             FROM test_result_evidence_links
           ) t
           WHERE t.row_num > 1
         );`,
        { transaction },
      );

      // 2. Add unique index on test_result_evidence_links (workspace_id, test_result_id, normalized_url)
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_test_result_evidence_links_unique_url
           ON test_result_evidence_links (workspace_id, test_result_id, normalized_url);`,
        { transaction },
      );

      // 3. Deterministically deduplicate bug_evidence_links keeping earliest row (added_at ASC, id ASC)
      await sequelize.query(
        `DELETE FROM bug_evidence_links
         WHERE id IN (
           SELECT id FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY workspace_id, bug_id, normalized_url
                      ORDER BY added_at ASC, id ASC
                    ) as row_num
             FROM bug_evidence_links
           ) t
           WHERE t.row_num > 1
         );`,
        { transaction },
      );

      // 4. Add unique index on bug_evidence_links (workspace_id, bug_id, normalized_url)
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_bug_evidence_links_unique_url
           ON bug_evidence_links (workspace_id, bug_id, normalized_url);`,
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
    });
  },
};
