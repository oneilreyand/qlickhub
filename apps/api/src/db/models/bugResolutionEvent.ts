import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface BugResolutionEventAttributes {
  id: string;
  workspaceId: string;
  bugId: string;
  sequence: number;
  candidateFingerprint: string;
  resolutionNotes: string;
  resolvedBy: string;
  createdAt?: Date;
}

type BugResolutionEventCreationAttributes = Optional<
  BugResolutionEventAttributes,
  'id' | 'createdAt'
>;

export class BugResolutionEventModel
  extends Model<BugResolutionEventAttributes, BugResolutionEventCreationAttributes>
  implements BugResolutionEventAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare bugId: string;
  declare sequence: number;
  declare candidateFingerprint: string;
  declare resolutionNotes: string;
  declare resolvedBy: string;
  declare readonly createdAt: Date;
}

BugResolutionEventModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    bugId: { type: DataTypes.UUID, allowNull: false, field: 'bug_id' },
    sequence: { type: DataTypes.INTEGER, allowNull: false },
    candidateFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'candidate_fingerprint',
    },
    resolutionNotes: { type: DataTypes.TEXT, allowNull: false, field: 'resolution_notes' },
    resolvedBy: { type: DataTypes.UUID, allowNull: false, field: 'resolved_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  { sequelize, tableName: 'bug_resolution_events', underscored: true, timestamps: false },
);
