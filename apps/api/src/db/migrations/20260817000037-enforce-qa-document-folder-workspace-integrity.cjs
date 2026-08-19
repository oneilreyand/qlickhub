'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Retain documents while removing only invalid cross-workspace folder references.
      await sequelize.query(
        `UPDATE qa_documents AS documents
         SET folder_id = NULL
         FROM work_folders AS folders
         WHERE documents.folder_id = folders.id
           AND documents.workspace_id <> folders.workspace_id;`,
        { transaction }
      );

      await sequelize.query(
        'ALTER TABLE qa_documents DROP CONSTRAINT IF EXISTS qa_documents_folder_id_fkey;',
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE qa_documents
         ADD CONSTRAINT fk_qa_documents_folder_workspace
         FOREIGN KEY (folder_id, workspace_id)
         REFERENCES work_folders(id, workspace_id)
         ON DELETE SET NULL (folder_id)
         ON UPDATE CASCADE;`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        'ALTER TABLE qa_documents DROP CONSTRAINT IF EXISTS fk_qa_documents_folder_workspace;',
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE qa_documents
         ADD CONSTRAINT qa_documents_folder_id_fkey
         FOREIGN KEY (folder_id)
         REFERENCES work_folders(id)
         ON DELETE SET NULL
         ON UPDATE CASCADE;`,
        { transaction }
      );
    });
  },
};
