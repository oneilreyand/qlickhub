import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

/** WORK-FOUNDATION P4 (ADR-044): a time-off date range; deliberately stores no reason. */
export interface UserTimeOffAttributes {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  createdBy?: string | null;
  createdAt?: Date;
}

export interface UserTimeOffCreationAttributes extends Optional<
  UserTimeOffAttributes,
  'id' | 'createdBy' | 'createdAt'
> {}

export class UserTimeOffModel
  extends Model<UserTimeOffAttributes, UserTimeOffCreationAttributes>
  implements UserTimeOffAttributes
{
  declare id: string;
  declare userId: string;
  declare startDate: string;
  declare endDate: string;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
}

UserTimeOffModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  { sequelize, tableName: 'user_time_off', timestamps: false, underscored: true },
);
