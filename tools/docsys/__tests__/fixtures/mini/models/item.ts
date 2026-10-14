import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize.js';

export class ItemModel extends Model {}
ItemModel.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
  },
  { sequelize, tableName: 'items', underscored: true },
);
