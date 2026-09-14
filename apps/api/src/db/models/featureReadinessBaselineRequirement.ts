import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface FeatureReadinessBaselineRequirementAttributes {
  workspaceId: string;
  baselineId: string;
  requirementId: string;
}

export class FeatureReadinessBaselineRequirementModel
  extends Model<
    FeatureReadinessBaselineRequirementAttributes,
    FeatureReadinessBaselineRequirementAttributes
  >
  implements FeatureReadinessBaselineRequirementAttributes
{
  declare workspaceId: string;
  declare baselineId: string;
  declare requirementId: string;
}

FeatureReadinessBaselineRequirementModel.init(
  {
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'workspace_id',
    },
    baselineId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'baseline_id',
    },
    requirementId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'requirement_id',
    },
  },
  {
    sequelize,
    tableName: 'feature_readiness_baseline_requirements',
    underscored: true,
    timestamps: false,
  },
);
