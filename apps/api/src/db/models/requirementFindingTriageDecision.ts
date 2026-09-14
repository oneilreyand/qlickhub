import { DataTypes, Model, Optional } from 'sequelize';
import type { RequirementFindingCause } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface RequirementFindingTriageDecisionAttributes {
  id: string;
  workspaceId: string;
  findingId: string;
  version: number;
  classification: RequirementFindingCause;
  mode: 'consensus' | 'governance';
  rationale: string;
  positionIds: { product: string; development: string; qa: string };
  supersedesDecisionId?: string | null;
  recordedBy: string;
  recordedAt?: Date;
}

type RequirementFindingTriageDecisionCreationAttributes = Optional<
  RequirementFindingTriageDecisionAttributes,
  'id' | 'supersedesDecisionId' | 'recordedAt'
>;

export class RequirementFindingTriageDecisionModel
  extends Model<
    RequirementFindingTriageDecisionAttributes,
    RequirementFindingTriageDecisionCreationAttributes
  >
  implements RequirementFindingTriageDecisionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare findingId: string;
  declare version: number;
  declare classification: RequirementFindingCause;
  declare mode: 'consensus' | 'governance';
  declare rationale: string;
  declare positionIds: { product: string; development: string; qa: string };
  declare supersedesDecisionId: string | null;
  declare recordedBy: string;
  declare readonly recordedAt: Date;
}

RequirementFindingTriageDecisionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    findingId: { type: DataTypes.UUID, allowNull: false, field: 'finding_id' },
    version: { type: DataTypes.INTEGER, allowNull: false },
    classification: { type: DataTypes.STRING(48), allowNull: false },
    mode: { type: DataTypes.STRING(24), allowNull: false },
    rationale: { type: DataTypes.TEXT, allowNull: false },
    positionIds: { type: DataTypes.JSONB, allowNull: false, field: 'position_ids_json' },
    supersedesDecisionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'supersedes_decision_id',
    },
    recordedBy: { type: DataTypes.UUID, allowNull: false, field: 'recorded_by' },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'recorded_at',
    },
  },
  {
    sequelize,
    tableName: 'requirement_finding_triage_decisions',
    underscored: true,
    timestamps: false,
  },
);
