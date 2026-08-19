import { DataTypes, Model, NonAttribute, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import type { UserModel } from './user.js';

export interface UserFcmTokenAttributes {
  id: string;
  userId: string;
  token: string;
  deviceInfo?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserFcmTokenCreationAttributes
  extends Optional<UserFcmTokenAttributes, 'id' | 'deviceInfo' | 'createdAt' | 'updatedAt'> {}

export class UserFcmTokenModel
  extends Model<UserFcmTokenAttributes, UserFcmTokenCreationAttributes>
  implements UserFcmTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare token: string;
  declare deviceInfo: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare user?: NonAttribute<UserModel>;
}

UserFcmTokenModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    token: {
      type: DataTypes.STRING(1024),
      allowNull: false,
    },
    deviceInfo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'device_info',
    },
  },
  {
    sequelize,
    tableName: 'user_fcm_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_user_fcm_tokens_user_id', fields: ['user_id'] },
      { name: 'idx_user_fcm_tokens_user_token_unique', unique: true, fields: ['user_id', 'token'] },
    ],
  }
);
