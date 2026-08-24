import { DataTypes, Model, Optional } from 'sequelize';
import type { BugActivityAction, BugStatus } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface BugActivityAttributes {
  id: string;
  workspaceId: string;
  bugId: string;
  actorId: string;
  action: BugActivityAction;
  fromStatus?: BugStatus | null;
  toStatus?: BugStatus | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

type BugActivityCreationAttributes = Optional<
  BugActivityAttributes,
  'id' | 'fromStatus' | 'toStatus' | 'metadata' | 'createdAt'
>;

export class BugActivityModel
  extends Model<BugActivityAttributes, BugActivityCreationAttributes>
  implements BugActivityAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare bugId: string;
  declare actorId: string;
  declare action: BugActivityAction;
  declare fromStatus: BugStatus | null;
  declare toStatus: BugStatus | null;
  declare metadata: Record<string, unknown> | null;
  declare readonly createdAt: Date;
}

BugActivityModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    bugId: { type: DataTypes.UUID, allowNull: false, field: 'bug_id' },
    actorId: { type: DataTypes.UUID, allowNull: false, field: 'actor_id' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    fromStatus: { type: DataTypes.STRING(32), allowNull: true, field: 'from_status' },
    toStatus: { type: DataTypes.STRING(32), allowNull: true, field: 'to_status' },
    metadata: { type: DataTypes.JSONB, allowNull: true, field: 'metadata_json' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'bug_activities',
    underscored: true,
    timestamps: false,
  },
);
