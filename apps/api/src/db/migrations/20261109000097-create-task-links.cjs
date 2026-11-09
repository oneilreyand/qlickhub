'use strict';

/**
 * F2 (FEATURE-REFERENCES-MEDIA): Tabel task_links untuk menyimpan referensi tautan eksternal
 * per Feature/Task (Figma, Dokumen, Spreadsheet, Video, dll.) dengan urutan dan metadata.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS task_links (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
           task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
           title VARCHAR(255) NOT NULL,
           url TEXT NOT NULL,
           link_type VARCHAR(32) NOT NULL DEFAULT 'other',
           sort_order INTEGER NOT NULL DEFAULT 0,
           created_by UUID REFERENCES users(id) ON DELETE SET NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
         );`,
        { transaction },
      );

      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_task_links_workspace_task
           ON task_links (workspace_id, task_id, sort_order ASC);`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS task_links;');
  },
};
