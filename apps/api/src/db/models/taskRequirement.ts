import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskRequirementAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  requirementId: string;
  linkedBy: string;
  createdAt?: Date;
}

export interface TaskRequirementCreationAttributes
  extends Optional<TaskRequirementAttributes, 'id' | 'createdAt'> {}

export class TaskRequirementModel
  extends Model<TaskRequirementAttributes, TaskRequirementCreationAttributes>
  implements TaskRequirementAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare requirementId: string;
  declare linkedBy: string;
  declare requirement?: any;
  declare task?: any;
  declare readonly createdAt: Date;
}

TaskRequirementModel.init(
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
    requirementId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'requirement_id',
    },
    linkedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'linked_by',
    },
  },
  {
    sequelize,
    tableName: 'task_requirements',
    timestamps: true,
    updatedAt: false,
  }
);
