import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface BugEvidenceLinkAttributes {
  id: string;
  workspaceId: string;
  bugId: string;
  url: string;
  provider: string;
  mediaKind: 'image' | 'video' | 'document' | 'other';
  label?: string | null;
  addedBy: string;
  addedAt?: Date;
  normalizedUrl: string;
  previewStatus: 'ready' | 'unsupported' | 'restricted' | 'failed';
}

type BugEvidenceLinkCreationAttributes = Optional<
  BugEvidenceLinkAttributes,
  'id' | 'label' | 'addedAt' | 'previewStatus'
>;

export class BugEvidenceLinkModel
  extends Model<BugEvidenceLinkAttributes, BugEvidenceLinkCreationAttributes>
  implements BugEvidenceLinkAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare bugId: string;
  declare url: string;
  declare provider: string;
  declare mediaKind: 'image' | 'video' | 'document' | 'other';
  declare label: string | null;
  declare addedBy: string;
  declare readonly addedAt: Date;
  declare normalizedUrl: string;
  declare previewStatus: 'ready' | 'unsupported' | 'restricted' | 'failed';
}

BugEvidenceLinkModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    bugId: { type: DataTypes.UUID, allowNull: false, field: 'bug_id' },
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
    tableName: 'bug_evidence_links',
    underscored: true,
    timestamps: false,
  },
);
