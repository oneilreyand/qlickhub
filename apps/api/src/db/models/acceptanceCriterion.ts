import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export type AcceptanceCriterionStatus = 'active' | 'deprecated';

export interface AcceptanceCriterionAttributes {
  id: string;
  workspaceId: string;
  requirementId: string;
  sequence: number;
  text: string;
  status: AcceptanceCriterionStatus;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AcceptanceCriterionCreationAttributes extends Optional<
  AcceptanceCriterionAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> {}

export class AcceptanceCriterionModel
  extends Model<AcceptanceCriterionAttributes, AcceptanceCriterionCreationAttributes>
  implements AcceptanceCriterionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare requirementId: string;
  declare sequence: number;
  declare text: string;
  declare status: AcceptanceCriterionStatus;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AcceptanceCriterionModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    requirementId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'requirement_id',
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'active',
      validate: { isIn: [['active', 'deprecated']] },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
  },
  {
    sequelize,
    tableName: 'acceptance_criteria',
    timestamps: true,
    underscored: true,
  },
);
