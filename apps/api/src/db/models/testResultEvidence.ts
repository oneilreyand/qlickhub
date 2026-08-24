import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestResultEvidenceAttributes {
  workspaceId: string;
  testResultId: string;
  attachmentId: string;
  linkedBy: string;
  linkedAt?: Date;
}

export class TestResultEvidenceModel
  extends Model<TestResultEvidenceAttributes, TestResultEvidenceAttributes>
  implements TestResultEvidenceAttributes
{
  declare workspaceId: string;
  declare testResultId: string;
  declare attachmentId: string;
  declare linkedBy: string;
  declare readonly linkedAt: Date;
}

TestResultEvidenceModel.init(
  {
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'workspace_id',
    },
    testResultId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'test_result_id',
    },
    attachmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'attachment_id',
    },
    linkedBy: { type: DataTypes.UUID, allowNull: false, field: 'linked_by' },
    linkedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'linked_at',
    },
  },
  {
    sequelize,
    tableName: 'test_result_evidence',
    underscored: true,
    timestamps: false,
  },
);
