import { DataTypes, Model, Optional } from 'sequelize';
import type { TaskBlockerCategory } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

/** WORK-FOUNDATION P5 (ADR-045): a blocker on a task with a person in charge. */
export interface TaskBlockerAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  category: TaskBlockerCategory;
  description: string;
  picUserId: string;
  openedBy: string | null;
  openedAt?: Date;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  resolutionNote?: string | null;
}

export interface TaskBlockerCreationAttributes extends Optional<
  TaskBlockerAttributes,
  'id' | 'openedAt' | 'resolvedBy' | 'resolvedAt' | 'resolutionNote'
> {}

export class TaskBlockerModel
  extends Model<TaskBlockerAttributes, TaskBlockerCreationAttributes>
  implements TaskBlockerAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare category: TaskBlockerCategory;
  declare description: string;
  declare picUserId: string;
  declare openedBy: string | null;
  declare openedAt: Date;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare resolutionNote: string | null;
}

TaskBlockerModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    taskId: { type: DataTypes.UUID, allowNull: false, field: 'task_id' },
    category: { type: DataTypes.STRING(32), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    picUserId: { type: DataTypes.UUID, allowNull: false, field: 'pic_user_id' },
    openedBy: { type: DataTypes.UUID, allowNull: true, field: 'opened_by' },
    openedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'opened_at',
    },
    resolvedBy: { type: DataTypes.UUID, allowNull: true, field: 'resolved_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    resolutionNote: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_note' },
  },
  {
    sequelize,
    tableName: 'task_blockers',
    timestamps: false,
    underscored: true,
  },
);
