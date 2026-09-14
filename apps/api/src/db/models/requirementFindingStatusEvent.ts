import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface RequirementFindingStatusEventAttributes {
  id: string;
  workspaceId: string;
  findingId: string;
  action: 'resolved' | 'reopened';
  reason: string;
  createdBy: string;
  createdAt?: Date;
}

type RequirementFindingStatusEventCreationAttributes = Optional<
  RequirementFindingStatusEventAttributes,
  'id' | 'createdAt'
>;

export class RequirementFindingStatusEventModel
  extends Model<
    RequirementFindingStatusEventAttributes,
    RequirementFindingStatusEventCreationAttributes
  >
  implements RequirementFindingStatusEventAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare findingId: string;
  declare action: 'resolved' | 'reopened';
  declare reason: string;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

RequirementFindingStatusEventModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    findingId: { type: DataTypes.UUID, allowNull: false, field: 'finding_id' },
    action: { type: DataTypes.STRING(16), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'requirement_finding_status_events',
    underscored: true,
    timestamps: false,
  },
);
