import { DataTypes, Model, Optional } from 'sequelize';
import type { TaskLinkType } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface TaskLinkAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  title: string;
  url: string;
  linkType: TaskLinkType;
  sortOrder: number;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskLinkCreationAttributes extends Optional<
  TaskLinkAttributes,
  'id' | 'linkType' | 'sortOrder' | 'createdBy' | 'createdAt' | 'updatedAt'
> {}

export class TaskLinkModel
  extends Model<TaskLinkAttributes, TaskLinkCreationAttributes>
  implements TaskLinkAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare title: string;
  declare url: string;
  declare linkType: TaskLinkType;
  declare sortOrder: number;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TaskLinkModel.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    linkType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'other',
      field: 'link_type',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'task_links',
    underscored: true,
    timestamps: true,
  },
);
