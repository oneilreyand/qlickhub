import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface QaDocumentAttributes {
  id: string;
  workspaceId: string;
  folderId?: string | null;
  title: string;
  docType: 'product_brief' | 'test_plan' | 'test_strategy' | 'release_report' | 'qa_guide';
  status: 'draft' | 'in_review' | 'approved';
  ownerId?: string | null;
  currentVersion: number;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QaDocumentCreationAttributes
  extends Optional<QaDocumentAttributes, 'id' | 'folderId' | 'docType' | 'status' | 'ownerId' | 'currentVersion' | 'createdAt' | 'updatedAt'> {}

export class QaDocumentModel
  extends Model<QaDocumentAttributes, QaDocumentCreationAttributes>
  implements QaDocumentAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare folderId: string | null;
  declare title: string;
  declare docType: 'product_brief' | 'test_plan' | 'test_strategy' | 'release_report' | 'qa_guide';
  declare status: 'draft' | 'in_review' | 'approved';
  declare ownerId: string | null;
  declare currentVersion: number;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare versions?: any[];
  declare currentVersionDetail?: any;
}

QaDocumentModel.init(
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
    folderId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'folder_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    docType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'test_plan',
      field: 'doc_type',
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'draft',
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'owner_id',
    },
    currentVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'current_version',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
  },
  {
    sequelize,
    tableName: 'qa_documents',
    underscored: true,
    timestamps: true,
  }
);
