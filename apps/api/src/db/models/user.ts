import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { UserRole } from '@qa/contracts';

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash?: string | null;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'passwordHash' | 'avatarUrl' | 'role'> {}

export class UserModel extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string | null;
  declare name: string;
  declare avatarUrl: string | null;
  declare role: UserRole;
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
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('admin', 'qa_lead', 'qa_member', 'dev', 'po', 'viewer'),
      allowNull: false,
      defaultValue: 'qa_member',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    paranoid: true,
  }
);
