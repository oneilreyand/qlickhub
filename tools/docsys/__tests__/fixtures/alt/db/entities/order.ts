import { DataTypes, Model } from 'sequelize';
import { db } from '../db.js';

export class Order extends Model {}
Order.init(
  { id: { type: DataTypes.UUID, primaryKey: true }, total: DataTypes.DECIMAL },
  { sequelize: db, tableName: 'orders' },
);
