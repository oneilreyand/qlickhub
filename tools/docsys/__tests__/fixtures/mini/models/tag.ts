import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize.js';

export class TagModel extends Model {}
TagModel.init({ id: { type: DataTypes.UUID, primaryKey: true }, label: DataTypes.STRING }, { sequelize, tableName: 'tags' });
