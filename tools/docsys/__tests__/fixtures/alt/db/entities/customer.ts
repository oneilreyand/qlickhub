import { DataTypes, Model } from 'sequelize';
import { db } from '../db.js';

export class Customer extends Model {}
Customer.init(
  { id: { type: DataTypes.UUID, primaryKey: true } },
  { sequelize: db, tableName: 'customers' },
);
