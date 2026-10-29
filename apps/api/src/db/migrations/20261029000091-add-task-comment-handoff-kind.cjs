'use strict';

/**
 * P4a (AC-4.2, AC-4.4): penanda serah-terima pada komentar task. Kolom nullable tanpa default
 * dan tanpa backfill, jadi komentar lama tidak berubah dan tabel tidak ditulis ulang.
 * `handoff_kind` hanya label; tidak memberi hak akses (authorization.md).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS handoff_kind VARCHAR(30) NULL;`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_handoff_kind_check;`,
        { transaction },
      );
      await sequelize.query(
        `ALTER TABLE task_comments ADD CONSTRAINT task_comments_handoff_kind_check
           CHECK (handoff_kind IS NULL OR handoff_kind IN
             ('review_feedback', 'question', 'ready_for_qa', 'fix_ready', 'answer'));`,
        { transaction },
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_comments_handoff
           ON task_comments (task_id, created_at DESC) WHERE handoff_kind IS NOT NULL;`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP INDEX IF EXISTS idx_task_comments_handoff;`, { transaction });
      await sequelize.query(
        `ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_handoff_kind_check;`,
        { transaction },
      );
      await sequelize.query(`ALTER TABLE task_comments DROP COLUMN IF EXISTS handoff_kind;`, {
        transaction,
      });
    });
  },
};
