import { DataTypes, Model, Optional } from 'sequelize';
import type { FeatureReadinessBaselineSnapshot } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface FeatureReadinessBaselineAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  sequence: number;
  mode: 'observation';
  productBriefVersionId: string;
  devReviewId?: string | null;
  qaReviewId?: string | null;
  snapshot: FeatureReadinessBaselineSnapshot;
  establishedBy: string;
  establishedAt?: Date;
  overrideReason?: string | null;
  overrideExpiresAt?: Date | null;
}

type FeatureReadinessBaselineCreationAttributes = Optional<
  FeatureReadinessBaselineAttributes,
  | 'id'
  | 'mode'
  | 'devReviewId'
  | 'qaReviewId'
  | 'establishedAt'
  | 'overrideReason'
  | 'overrideExpiresAt'
>;

export class FeatureReadinessBaselineModel
  extends Model<FeatureReadinessBaselineAttributes, FeatureReadinessBaselineCreationAttributes>
  implements FeatureReadinessBaselineAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare sequence: number;
  declare mode: 'observation';
  declare productBriefVersionId: string;
  declare devReviewId: string | null;
  declare qaReviewId: string | null;
  declare snapshot: FeatureReadinessBaselineSnapshot;
  declare establishedBy: string;
  declare readonly establishedAt: Date;
  declare overrideReason: string | null;
  declare overrideExpiresAt: Date | null;
}

FeatureReadinessBaselineModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    sequence: { type: DataTypes.INTEGER, allowNull: false },
    mode: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'observation' },
    productBriefVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_brief_version_id',
    },
    devReviewId: { type: DataTypes.UUID, allowNull: true, field: 'dev_review_id' },
    qaReviewId: { type: DataTypes.UUID, allowNull: true, field: 'qa_review_id' },
    snapshot: { type: DataTypes.JSONB, allowNull: false, field: 'snapshot_json' },
    establishedBy: { type: DataTypes.UUID, allowNull: false, field: 'established_by' },
    establishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'established_at',
    },
    overrideReason: { type: DataTypes.TEXT, allowNull: true, field: 'override_reason' },
    overrideExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'override_expires_at' },
  },
  {
    sequelize,
    tableName: 'feature_readiness_baselines',
    underscored: true,
    timestamps: false,
  },
);
