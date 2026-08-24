import { DataTypes, Model, Optional } from 'sequelize';
import type { DeveloperSpecialty } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface WorkspaceMemberSpecialtyAttributes {
  id: string;
  workspaceId: string;
  workspaceMemberId: string;
  specialty: DeveloperSpecialty;
  createdBy: string;
  createdAt?: Date;
}

type WorkspaceMemberSpecialtyCreationAttributes = Optional<
  WorkspaceMemberSpecialtyAttributes,
  'id' | 'createdAt'
>;

export class WorkspaceMemberSpecialtyModel
  extends Model<WorkspaceMemberSpecialtyAttributes, WorkspaceMemberSpecialtyCreationAttributes>
  implements WorkspaceMemberSpecialtyAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare workspaceMemberId: string;
  declare specialty: DeveloperSpecialty;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

WorkspaceMemberSpecialtyModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    workspaceMemberId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_member_id' },
    specialty: { type: DataTypes.STRING(32), allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'workspace_member_specialties',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    underscored: true,
  },
);
