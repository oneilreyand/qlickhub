import { DataTypes, Model, NonAttribute, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import type { UserModel } from './user.js';

export interface AuthSessionAttributes {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthSessionCreationAttributes
  extends Optional<AuthSessionAttributes, 'id' | 'userAgent' | 'ipAddress' | 'revokedAt'> {}

export class AuthSessionModel extends Model<AuthSessionAttributes, AuthSessionCreationAttributes> implements AuthSessionAttributes {
  declare id: string;
  declare userId: string;
  declare userAgent: string | null;
  declare ipAddress: string | null;
  declare expiresAt: Date;
  declare revokedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare user?: NonAttribute<UserModel>;
}

AuthSessionModel.init(
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
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'user_agent',
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'ip_address',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
  },
  {
    sequelize,
    tableName: 'auth_sessions',
    timestamps: true,
    underscored: true,
    indexes: [{ name: 'idx_auth_sessions_user_active', fields: ['user_id', 'revoked_at', 'expires_at'] }],
  }
);
