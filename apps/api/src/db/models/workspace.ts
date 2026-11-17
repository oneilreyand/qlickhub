import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface WorkspaceAttributes {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  allowQaTaskCreation?: boolean;
  archivedAt?: Date | null;
  timezone?: string;
  workingDays?: number[];
  defaultWeeklyCapacityPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkspaceCreationAttributes extends Optional<
  WorkspaceAttributes,
  | 'id'
  | 'description'
  | 'allowQaTaskCreation'
  | 'archivedAt'
  | 'timezone'
  | 'workingDays'
  | 'defaultWeeklyCapacityPoints'
> {}

export class WorkspaceModel
  extends Model<WorkspaceAttributes, WorkspaceCreationAttributes>
  implements WorkspaceAttributes
{
  declare id: string;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare ownerId: string;
  declare allowQaTaskCreation: boolean;
  declare archivedAt: Date | null;
  declare timezone: string;
  declare workingDays: number[];
  declare defaultWeeklyCapacityPoints: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WorkspaceModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id',
    },
    allowQaTaskCreation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'allow_qa_task_creation',
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'archived_at',
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'Asia/Jakarta',
    },
    workingDays: {
      type: DataTypes.ARRAY(DataTypes.SMALLINT),
      allowNull: false,
      defaultValue: [1, 2, 3, 4, 5],
      field: 'working_days',
    },
    defaultWeeklyCapacityPoints: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 15,
      field: 'default_weekly_capacity_points',
    },
  },
  {
    sequelize,
    tableName: 'workspaces',
    timestamps: true,
    underscored: true,
  },
);
