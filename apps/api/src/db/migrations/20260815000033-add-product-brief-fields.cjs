'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'qa_documents',
        'status',
        {
          type: Sequelize.STRING(24),
          allowNull: false,
          defaultValue: 'draft',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'qa_documents',
        'owner_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        { transaction }
      );

      await queryInterface.addIndex('qa_documents', ['workspace_id', 'owner_id'], {
        name: 'idx_qa_documents_workspace_owner',
        transaction,
      });

      await queryInterface.addColumn(
        'qa_document_versions',
        'in_scope',
        {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: Sequelize.literal("'[]'::jsonb"),
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'qa_document_versions',
        'out_scope',
        {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: Sequelize.literal("'[]'::jsonb"),
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'task_documents',
        'link_type',
        {
          type: Sequelize.STRING(24),
          allowNull: false,
          defaultValue: 'reference',
        },
        { transaction }
      );

      await sequelize.query(
        `CREATE UNIQUE INDEX uk_task_documents_primary_prd
         ON task_documents (task_id)
         WHERE link_type = 'primary_prd';`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('task_documents', 'uk_task_documents_primary_prd', { transaction });
      await queryInterface.removeColumn('task_documents', 'link_type', { transaction });
      await sequelize.query('ALTER TABLE qa_document_versions DROP COLUMN IF EXISTS out_scope;', { transaction });
      await sequelize.query('ALTER TABLE qa_document_versions DROP COLUMN IF EXISTS out_of_scope;', { transaction });
      await queryInterface.removeColumn('qa_document_versions', 'in_scope', { transaction });
      await queryInterface.removeIndex('qa_documents', 'idx_qa_documents_workspace_owner', { transaction });
      await queryInterface.removeColumn('qa_documents', 'owner_id', { transaction });
      await queryInterface.removeColumn('qa_documents', 'status', { transaction });
    });
  },
};
