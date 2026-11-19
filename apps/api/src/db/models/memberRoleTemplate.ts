import { DataTypes, Model, Optional } from 'sequelize';
import type { RoleTemplateEntry } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

/** MEMBER-ACCESS-HUB P4 (ADR-046): a saved Workspace + role set, owned by one Owner/Admin. */
export interface MemberRoleTemplateAttributes {
  id: string;
  ownerUserId: string;
  name: string;
  entries: RoleTemplateEntry[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemberRoleTemplateCreationAttributes extends Optional<
  MemberRoleTemplateAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class MemberRoleTemplateModel
  extends Model<MemberRoleTemplateAttributes, MemberRoleTemplateCreationAttributes>
  implements MemberRoleTemplateAttributes
{
  declare id: string;
  declare ownerUserId: string;
  declare name: string;
  declare entries: RoleTemplateEntry[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MemberRoleTemplateModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ownerUserId: { type: DataTypes.UUID, allowNull: false, field: 'owner_user_id' },
    name: { type: DataTypes.STRING(60), allowNull: false },
    entries: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'member_role_templates', timestamps: true, underscored: true },
);
