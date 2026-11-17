import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

/** WORK-FOUNDATION P4 (ADR-044): a person's own weekly capacity override, across Workspaces. */
export interface UserCapacityAttributes {
  userId: string;
  weeklyPoints: number;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCapacityCreationAttributes extends Optional<
  UserCapacityAttributes,
  'updatedBy' | 'createdAt' | 'updatedAt'
> {}

export class UserCapacityModel
  extends Model<UserCapacityAttributes, UserCapacityCreationAttributes>
  implements UserCapacityAttributes
{
  declare userId: string;
  declare weeklyPoints: number;
  declare updatedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserCapacityModel.init(
  {
    userId: { type: DataTypes.UUID, primaryKey: true, field: 'user_id' },
    weeklyPoints: { type: DataTypes.SMALLINT, allowNull: false, field: 'weekly_points' },
    updatedBy: { type: DataTypes.UUID, allowNull: true, field: 'updated_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'user_capacities', timestamps: true, underscored: true },
);
