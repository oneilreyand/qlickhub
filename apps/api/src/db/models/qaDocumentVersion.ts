import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface QaDocumentVersionAttributes {
  id: string;
  workspaceId: string;
  documentId: string;
  version: number;
  title: string;
  contentMarkdown: string;
  changelog?: string | null;
  createdBy: string;
  createdAt?: Date;
}

export interface QaDocumentVersionCreationAttributes
  extends Optional<QaDocumentVersionAttributes, 'id' | 'changelog' | 'createdAt'> {}

export class QaDocumentVersionModel
  extends Model<QaDocumentVersionAttributes, QaDocumentVersionCreationAttributes>
  implements QaDocumentVersionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare documentId: string;
  declare version: number;
  declare title: string;
  declare contentMarkdown: string;
  declare changelog: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

QaDocumentVersionModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'document_id',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contentMarkdown: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'content_markdown',
    },
    changelog: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
  },
  {
    sequelize,
    tableName: 'qa_document_versions',
    timestamps: true,
    updatedAt: false,
  }
);
