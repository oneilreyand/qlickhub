import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { TaskStatus, TaskPriority, DeliveryArea } from '@qa/contracts';

export interface TaskAttributes {
  id: string;
  workspaceId: string;
  folderId?: string | null;
  parentTaskId?: string | null;
  deliveryArea?: DeliveryArea | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  reporterId: string;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface TaskCreationAttributes
  extends Optional<
    TaskAttributes,
    'id' | 'folderId' | 'parentTaskId' | 'deliveryArea' | 'description' | 'status' | 'priority' | 'assigneeId' | 'startDate' | 'dueDate' | 'completedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
  > {}

export class TaskModel
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare folderId: string | null;
  declare parentTaskId: string | null;
  declare deliveryArea: DeliveryArea | null;
  declare title: string;
  declare description: string | null;
  declare status: TaskStatus;
  declare priority: TaskPriority;
  declare assigneeId: string | null;
  declare reporterId: string;
  declare startDate: string | null;
  declare dueDate: string | null;
  declare completedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;
}

TaskModel.init(
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
    folderId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'folder_id',
    },
    parentTaskId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_task_id',
    },
    deliveryArea: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'delivery_area',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'todo',
    },
    priority: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'medium',
    },
    assigneeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assignee_id',
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'reporter_id',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'start_date',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);
