import { DataTypes, Model, Optional } from 'sequelize';
import type { TaskRelationType } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

/** MY-WORK-REPORT P4 (ADR-047): a relation between two tasks, possibly across Workspaces. */
export interface TaskRelationAttributes {
  id: string;
  workspaceId: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: TaskRelationType;
  createdBy?: string | null;
  createdAt?: Date;
}

export interface TaskRelationCreationAttributes extends Optional<
  TaskRelationAttributes,
  'id' | 'createdBy' | 'createdAt'
> {}

export class TaskRelationModel
  extends Model<TaskRelationAttributes, TaskRelationCreationAttributes>
  implements TaskRelationAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare sourceTaskId: string;
  declare targetTaskId: string;
  declare type: TaskRelationType;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
}

TaskRelationModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    sourceTaskId: { type: DataTypes.UUID, allowNull: false, field: 'source_task_id' },
    targetTaskId: { type: DataTypes.UUID, allowNull: false, field: 'target_task_id' },
    type: { type: DataTypes.STRING(16), allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  { sequelize, tableName: 'task_relations', timestamps: false, underscored: true },
);
