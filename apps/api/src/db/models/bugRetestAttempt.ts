import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface BugRetestAttemptAttributes {
  id: string;
  workspaceId: string;
  bugId: string;
  resolutionEventId: string;
  testResultId: string;
  outcome: 'verified' | 'reopened';
  attemptedBy: string;
  createdAt?: Date;
}

type BugRetestAttemptCreationAttributes = Optional<BugRetestAttemptAttributes, 'id' | 'createdAt'>;

export class BugRetestAttemptModel
  extends Model<BugRetestAttemptAttributes, BugRetestAttemptCreationAttributes>
  implements BugRetestAttemptAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare bugId: string;
  declare resolutionEventId: string;
  declare testResultId: string;
  declare outcome: 'verified' | 'reopened';
  declare attemptedBy: string;
  declare readonly createdAt: Date;
}

BugRetestAttemptModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    bugId: { type: DataTypes.UUID, allowNull: false, field: 'bug_id' },
    resolutionEventId: { type: DataTypes.UUID, allowNull: false, field: 'resolution_event_id' },
    testResultId: { type: DataTypes.UUID, allowNull: false, field: 'test_result_id' },
    outcome: { type: DataTypes.STRING(16), allowNull: false },
    attemptedBy: { type: DataTypes.UUID, allowNull: false, field: 'attempted_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  { sequelize, tableName: 'bug_retest_attempts', underscored: true, timestamps: false },
);
