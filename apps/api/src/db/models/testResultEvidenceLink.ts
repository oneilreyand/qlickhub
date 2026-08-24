import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestResultEvidenceLinkAttributes {
  id: string;
  workspaceId: string;
  testResultId: string;
  url: string;
  provider: string;
  mediaKind: 'image' | 'video' | 'document' | 'other';
  label?: string | null;
  addedBy: string;
  addedAt?: Date;
  normalizedUrl: string;
  previewStatus: 'ready' | 'unsupported' | 'restricted' | 'failed';
}

type TestResultEvidenceLinkCreationAttributes = Optional<
  TestResultEvidenceLinkAttributes,
  'id' | 'label' | 'addedAt' | 'previewStatus'
>;

export class TestResultEvidenceLinkModel
  extends Model<TestResultEvidenceLinkAttributes, TestResultEvidenceLinkCreationAttributes>
  implements TestResultEvidenceLinkAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testResultId: string;
  declare url: string;
  declare provider: string;
  declare mediaKind: 'image' | 'video' | 'document' | 'other';
  declare label: string | null;
  declare addedBy: string;
  declare readonly addedAt: Date;
  declare normalizedUrl: string;
  declare previewStatus: 'ready' | 'unsupported' | 'restricted' | 'failed';
}

TestResultEvidenceLinkModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testResultId: { type: DataTypes.UUID, allowNull: false, field: 'test_result_id' },
    url: { type: DataTypes.TEXT, allowNull: false },
    provider: { type: DataTypes.STRING(64), allowNull: false },
    mediaKind: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'other',
      field: 'media_kind',
    },
    label: { type: DataTypes.STRING(255), allowNull: true },
    addedBy: { type: DataTypes.UUID, allowNull: false, field: 'added_by' },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'added_at',
    },
    normalizedUrl: { type: DataTypes.TEXT, allowNull: false, field: 'normalized_url' },
    previewStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'ready',
      field: 'preview_status',
    },
  },
  {
    sequelize,
    tableName: 'test_result_evidence_links',
    underscored: true,
    timestamps: false,
  },
);
