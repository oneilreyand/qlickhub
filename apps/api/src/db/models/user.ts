import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { UserRole } from '@qlick/contracts';

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash?: string | null;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: Date | null;
  onboardingCompletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'passwordHash' | 'avatarUrl' | 'role' | 'passwordResetToken' | 'passwordResetExpiresAt' | 'onboardingCompletedAt'> {}

export class UserModel extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string | null;
  declare name: string;
  declare avatarUrl: string | null;
  declare role: UserRole;
  declare passwordResetToken: string | null;
  declare passwordResetExpiresAt: Date | null;
  declare onboardingCompletedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt: Date | null;
}

UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_hash',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'avatar_url',
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'po', 'dev', 'qa', 'viewer'),
      allowNull: false,
      defaultValue: 'dev',
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_reset_token',
    },
    passwordResetExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires_at',
    },
    onboardingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'onboarding_completed_at',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);
