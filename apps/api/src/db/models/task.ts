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
  reviewedBy?: string | null;
  reviewNotes?: string | null;
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
    'id' | 'folderId' | 'parentTaskId' | 'deliveryArea' | 'description' | 'status' | 'priority' | 'assigneeId' | 'reviewedBy' | 'reviewNotes' | 'startDate' | 'dueDate' | 'completedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
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
  declare reviewedBy: string | null;
  declare reviewNotes: string | null;
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
      type: DataTypes.ENUM('frontend', 'backend', 'qa'),
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
      type: DataTypes.ENUM('todo', 'in_progress', 'in_review', 'changes_requested', 'done', 'canceled'),
      allowNull: false,
      defaultValue: 'todo',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
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
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reviewed_by',
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'review_notes',
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
    indexes: [
      {
        name: 'idx_tasks_workspace',
        fields: ['workspace_id'],
      },
      {
        name: 'idx_tasks_folder',
        fields: ['folder_id'],
      },
      {
        name: 'idx_tasks_workspace_status_priority',
        fields: ['workspace_id', 'status', 'priority'],
      },
      {
        name: 'idx_tasks_workspace_dates',
        fields: ['workspace_id', 'due_date', 'start_date'],
      },
      {
        name: 'idx_tasks_workspace_assignee',
        fields: ['workspace_id', 'assignee_id'],
      },
    ],
  }
);
