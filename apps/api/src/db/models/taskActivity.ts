import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskActivityAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  actorId?: string | null;
  action: string;
  metadataJson?: Record<string, unknown> | null;
  createdAt?: Date;
}

export interface TaskActivityCreationAttributes
  extends Optional<TaskActivityAttributes, 'id' | 'actorId' | 'metadataJson' | 'createdAt'> {}

export class TaskActivityModel
  extends Model<TaskActivityAttributes, TaskActivityCreationAttributes>
  implements TaskActivityAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare actorId: string | null;
  declare action: string;
  declare metadataJson: Record<string, unknown> | null;
  declare readonly createdAt: Date;
}

TaskActivityModel.init(
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
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'task_id',
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'actor_id',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    metadataJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'metadata_json',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'task_activity',
    timestamps: false,
    underscored: true,
  }
);
