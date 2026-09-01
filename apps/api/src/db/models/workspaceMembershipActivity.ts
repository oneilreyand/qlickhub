import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export type WorkspaceMembershipActivityAction =
  | 'member_removed'
  | 'member_restored'
  | 'member_role_updated'
  | 'member_specialties_updated'
  | 'workspace_archived'
  | 'workspace_restored';

export interface WorkspaceMembershipActivityAttributes {
  id: string;
  workspaceId: string;
  actorId: string;
  targetUserId: string;
  action: WorkspaceMembershipActivityAction;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

type WorkspaceMembershipActivityCreationAttributes = Optional<
  WorkspaceMembershipActivityAttributes,
  'id' | 'metadata' | 'createdAt'
>;

export class WorkspaceMembershipActivityModel
  extends Model<
    WorkspaceMembershipActivityAttributes,
    WorkspaceMembershipActivityCreationAttributes
  >
  implements WorkspaceMembershipActivityAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare actorId: string;
  declare targetUserId: string;
  declare action: WorkspaceMembershipActivityAction;
  declare metadata: Record<string, unknown> | null;
  declare readonly createdAt: Date;
}

WorkspaceMembershipActivityModel.init(
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
    actorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'actor_id',
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'target_user_id',
    },
    action: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'metadata_json',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'workspace_membership_activity',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    underscored: true,
  },
);
