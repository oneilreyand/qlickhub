import { DataTypes, Model, Optional } from 'sequelize';
import type {
  FeatureReadinessConcernSeverity,
  FeatureReadinessRecommendation,
  FeatureReadinessReviewRole,
} from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface FeatureReadinessReviewAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  reviewerRole: FeatureReadinessReviewRole;
  recommendation: FeatureReadinessRecommendation;
  notes: string;
  concernSeverity?: FeatureReadinessConcernSeverity | null;
  createdBy: string;
  createdAt?: Date;
}

type FeatureReadinessReviewCreationAttributes = Optional<
  FeatureReadinessReviewAttributes,
  'id' | 'concernSeverity' | 'createdAt'
>;

export class FeatureReadinessReviewModel
  extends Model<FeatureReadinessReviewAttributes, FeatureReadinessReviewCreationAttributes>
  implements FeatureReadinessReviewAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare reviewerRole: FeatureReadinessReviewRole;
  declare recommendation: FeatureReadinessRecommendation;
  declare notes: string;
  declare concernSeverity: FeatureReadinessConcernSeverity | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

FeatureReadinessReviewModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    reviewerRole: { type: DataTypes.STRING(16), allowNull: false, field: 'reviewer_role' },
    recommendation: { type: DataTypes.STRING(32), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: false },
    concernSeverity: { type: DataTypes.STRING(16), allowNull: true, field: 'concern_severity' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'feature_readiness_reviews',
    underscored: true,
    timestamps: false,
  },
);
