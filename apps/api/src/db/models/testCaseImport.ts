import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestCaseImportAttributes {
  id: string;
  workspaceId: string;
  actorId: string;
  sourceFileName: string;
  contentHash: string;
  templateVersion: string;
  mode: 'create_only' | 'update';
  status: 'in_progress' | 'completed' | 'failed';
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  createdAt?: Date;
  completedAt?: Date | null;
}

type TestCaseImportCreationAttributes = Optional<
  TestCaseImportAttributes,
  | 'id'
  | 'templateVersion'
  | 'mode'
  | 'status'
  | 'totalRows'
  | 'createdRows'
  | 'updatedRows'
  | 'skippedRows'
  | 'failedRows'
  | 'createdAt'
  | 'completedAt'
>;

export class TestCaseImportModel
  extends Model<TestCaseImportAttributes, TestCaseImportCreationAttributes>
  implements TestCaseImportAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare actorId: string;
  declare sourceFileName: string;
  declare contentHash: string;
  declare templateVersion: string;
  declare mode: 'create_only' | 'update';
  declare status: 'in_progress' | 'completed' | 'failed';
  declare totalRows: number;
  declare createdRows: number;
  declare updatedRows: number;
  declare skippedRows: number;
  declare failedRows: number;
  declare readonly createdAt: Date;
  declare completedAt: Date | null;
}

TestCaseImportModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    actorId: { type: DataTypes.UUID, allowNull: false, field: 'actor_id' },
    sourceFileName: { type: DataTypes.STRING(255), allowNull: false, field: 'source_file_name' },
    contentHash: { type: DataTypes.STRING(64), allowNull: false, field: 'content_hash' },
    templateVersion: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '1.0',
      field: 'template_version',
    },
    mode: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'create_only' },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'completed' },
    totalRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_rows' },
    createdRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'created_rows',
    },
    updatedRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'updated_rows',
    },
    skippedRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'skipped_rows',
    },
    failedRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'failed_rows',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  },
  {
    sequelize,
    tableName: 'test_case_imports',
    underscored: true,
    timestamps: false,
  },
);
