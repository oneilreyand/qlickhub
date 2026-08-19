import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface QaDocumentVersionAttributes {
  id: string;
  workspaceId: string;
  documentId: string;
  version: number;
  title: string;
  contentMarkdown: string;
  inScope: Array<{ id: string; text: string; position: number }>;
  outScope: Array<{ id: string; text: string; position: number }>;
  acceptanceCriteria: Array<{ id: string; text: string; position: number }>;
  changelog?: string | null;
  createdBy: string;
  createdAt?: Date;
}

export interface QaDocumentVersionCreationAttributes
  extends Optional<QaDocumentVersionAttributes, 'id' | 'inScope' | 'outScope' | 'acceptanceCriteria' | 'changelog' | 'createdAt'> {}

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
  declare inScope: Array<{ id: string; text: string; position: number }>;
  declare outScope: Array<{ id: string; text: string; position: number }>;
  declare acceptanceCriteria: Array<{ id: string; text: string; position: number }>;
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
    inScope: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'in_scope',
    },
    outScope: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'out_scope',
    },
    acceptanceCriteria: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'acceptance_criteria',
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
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
