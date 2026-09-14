import { DataTypes, Model, Optional } from 'sequelize';
import type { RequirementFindingCause, RequirementFindingTriageGroup } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface RequirementFindingTriagePositionAttributes {
  id: string;
  workspaceId: string;
  findingId: string;
  participantGroup: RequirementFindingTriageGroup;
  classification: RequirementFindingCause;
  rationale: string;
  createdBy: string;
  createdAt?: Date;
}

type RequirementFindingTriagePositionCreationAttributes = Optional<
  RequirementFindingTriagePositionAttributes,
  'id' | 'createdAt'
>;

export class RequirementFindingTriagePositionModel
  extends Model<
    RequirementFindingTriagePositionAttributes,
    RequirementFindingTriagePositionCreationAttributes
  >
  implements RequirementFindingTriagePositionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare findingId: string;
  declare participantGroup: RequirementFindingTriageGroup;
  declare classification: RequirementFindingCause;
  declare rationale: string;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

RequirementFindingTriagePositionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    findingId: { type: DataTypes.UUID, allowNull: false, field: 'finding_id' },
    participantGroup: {
      type: DataTypes.STRING(24),
      allowNull: false,
      field: 'participant_group',
    },
    classification: { type: DataTypes.STRING(48), allowNull: false },
    rationale: { type: DataTypes.TEXT, allowNull: false },
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
    tableName: 'requirement_finding_triage_positions',
    underscored: true,
    timestamps: false,
  },
);
