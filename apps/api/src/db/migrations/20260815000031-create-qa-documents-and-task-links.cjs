'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1. Create qa_documents table
      await queryInterface.createTable(
        'qa_documents',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'workspaces',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          folder_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'work_folders',
              key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          doc_type: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'test_plan',
          },
          current_version: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE qa_documents
         ADD CONSTRAINT uk_qa_documents_workspace_id UNIQUE (workspace_id, id);`,
        { transaction }
      );

      await queryInterface.addIndex('qa_documents', ['workspace_id', 'folder_id'], {
        name: 'idx_qa_documents_workspace_folder',
        transaction,
      });

      // 2. Create qa_document_versions table
      await queryInterface.createTable(
        'qa_document_versions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'workspaces',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          document_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'qa_documents',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          version: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          content_markdown: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          changelog: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE qa_document_versions
         ADD CONSTRAINT uk_qa_document_versions_doc_ver UNIQUE (document_id, version);`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE qa_document_versions
         ADD CONSTRAINT fk_qa_doc_versions_workspace_doc
         FOREIGN KEY (workspace_id, document_id)
         REFERENCES qa_documents(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await queryInterface.addIndex('qa_document_versions', ['workspace_id', 'document_id', 'version'], {
        name: 'idx_qa_doc_versions_doc_ver',
        transaction,
      });

      // 3. Create task_documents junction table
      await queryInterface.createTable(
        'task_documents',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          workspace_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'workspaces',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          task_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'tasks',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          document_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'qa_documents',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          linked_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_documents
         ADD CONSTRAINT uk_task_documents_task_doc UNIQUE (task_id, document_id);`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_documents
         ADD CONSTRAINT fk_task_documents_workspace_task
         FOREIGN KEY (workspace_id, task_id)
         REFERENCES tasks(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await sequelize.query(
        `ALTER TABLE task_documents
         ADD CONSTRAINT fk_task_documents_workspace_doc
         FOREIGN KEY (workspace_id, document_id)
         REFERENCES qa_documents(workspace_id, id)
         ON DELETE CASCADE ON UPDATE CASCADE;`,
        { transaction }
      );

      await queryInterface.addIndex('task_documents', ['workspace_id', 'task_id'], {
        name: 'idx_task_documents_task',
        transaction,
      });

      await queryInterface.addIndex('task_documents', ['workspace_id', 'document_id'], {
        name: 'idx_task_documents_doc',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('task_documents', { transaction });
      await queryInterface.dropTable('qa_document_versions', { transaction });
      await queryInterface.dropTable('qa_documents', { transaction });
    });
  },
};
