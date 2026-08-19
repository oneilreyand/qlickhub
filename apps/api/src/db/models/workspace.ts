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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkspaceCreationAttributes extends Optional<WorkspaceAttributes, 'id' | 'description' | 'allowQaTaskCreation' | 'archivedAt'> {}

export class WorkspaceModel extends Model<WorkspaceAttributes, WorkspaceCreationAttributes> implements WorkspaceAttributes {
  declare id: string;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare ownerId: string;
  declare allowQaTaskCreation: boolean;
  declare archivedAt: Date | null;
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
  },
  {
    sequelize,
    tableName: 'workspaces',
    timestamps: true,
    underscored: true,
  }
);
