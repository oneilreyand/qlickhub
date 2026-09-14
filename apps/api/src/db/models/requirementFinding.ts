import { DataTypes, Model, Optional } from 'sequelize';
import type {
  RequirementFindingCategory,
  RequirementFindingCause,
  RequirementFindingSeverity,
  RequirementFindingTriageGroup,
} from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface RequirementFindingAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  requirementStatus: 'draft' | 'active' | 'deprecated';
  category: RequirementFindingCategory;
  severity: RequirementFindingSeverity;
  summary: string;
  details: string;
  proposedCause: RequirementFindingCause;
  reporterGroup: RequirementFindingTriageGroup;
  reportedBy: string;
  reportedAt?: Date;
}

type RequirementFindingCreationAttributes = Optional<
  RequirementFindingAttributes,
  'id' | 'reportedAt'
>;

export class RequirementFindingModel
  extends Model<RequirementFindingAttributes, RequirementFindingCreationAttributes>
  implements RequirementFindingAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare requirementId: string;
  declare requirementCode: string;
  declare requirementTitle: string;
  declare requirementStatus: 'draft' | 'active' | 'deprecated';
  declare category: RequirementFindingCategory;
  declare severity: RequirementFindingSeverity;
  declare summary: string;
  declare details: string;
  declare proposedCause: RequirementFindingCause;
  declare reporterGroup: RequirementFindingTriageGroup;
  declare reportedBy: string;
  declare readonly reportedAt: Date;
}

RequirementFindingModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    requirementId: { type: DataTypes.UUID, allowNull: false, field: 'requirement_id' },
    requirementCode: { type: DataTypes.STRING(50), allowNull: false, field: 'requirement_code' },
    requirementTitle: { type: DataTypes.STRING(255), allowNull: false, field: 'requirement_title' },
    requirementStatus: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'requirement_status',
    },
    category: { type: DataTypes.STRING(48), allowNull: false },
    severity: { type: DataTypes.STRING(16), allowNull: false },
    summary: { type: DataTypes.STRING(255), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: false },
    proposedCause: { type: DataTypes.STRING(48), allowNull: false, field: 'proposed_cause' },
    reporterGroup: { type: DataTypes.STRING(24), allowNull: false, field: 'reporter_group' },
    reportedBy: { type: DataTypes.UUID, allowNull: false, field: 'reported_by' },
    reportedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'reported_at',
    },
  },
  {
    sequelize,
    tableName: 'requirement_findings',
    underscored: true,
    timestamps: false,
  },
);
