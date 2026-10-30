import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface FeatureSpecQuestionAttributes {
  id: string;
  specId: string;
  workspaceId: string;
  position: number;
  text: string;
  reason: string;
  required: boolean;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeatureSpecQuestionCreationAttributes extends Optional<
  FeatureSpecQuestionAttributes,
  'id' | 'reason' | 'required' | 'answer' | 'answeredBy' | 'answeredAt' | 'createdAt' | 'updatedAt'
> {}

export class FeatureSpecQuestionModel
  extends Model<FeatureSpecQuestionAttributes, FeatureSpecQuestionCreationAttributes>
  implements FeatureSpecQuestionAttributes
{
  declare id: string;
  declare specId: string;
  declare workspaceId: string;
  declare position: number;
  declare text: string;
  declare reason: string;
  declare required: boolean;
  declare answer: string | null;
  declare answeredBy: string | null;
  declare answeredAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

FeatureSpecQuestionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    specId: { type: DataTypes.UUID, allowNull: false, field: 'spec_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    position: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    answer: { type: DataTypes.TEXT, allowNull: true },
    answeredBy: { type: DataTypes.UUID, allowNull: true, field: 'answered_by' },
    answeredAt: { type: DataTypes.DATE, allowNull: true, field: 'answered_at' },
  },
  { sequelize, tableName: 'feature_spec_questions', underscored: true, timestamps: true },
);
