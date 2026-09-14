import { DataTypes, Model, Optional } from 'sequelize';
import type { RequirementFindingTriageGroup } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface RequirementFindingClarificationAttributes {
  id: string;
  workspaceId: string;
  findingId: string;
  message: string;
  authorGroup: RequirementFindingTriageGroup;
  createdBy: string;
  createdAt?: Date;
}

type RequirementFindingClarificationCreationAttributes = Optional<
  RequirementFindingClarificationAttributes,
  'id' | 'createdAt'
>;

export class RequirementFindingClarificationModel
  extends Model<
    RequirementFindingClarificationAttributes,
    RequirementFindingClarificationCreationAttributes
  >
  implements RequirementFindingClarificationAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare findingId: string;
  declare message: string;
  declare authorGroup: RequirementFindingTriageGroup;
  declare createdBy: string;
  declare readonly createdAt: Date;
}

RequirementFindingClarificationModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    findingId: { type: DataTypes.UUID, allowNull: false, field: 'finding_id' },
    message: { type: DataTypes.TEXT, allowNull: false },
    authorGroup: { type: DataTypes.STRING(24), allowNull: false, field: 'author_group' },
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
    tableName: 'requirement_finding_clarifications',
    underscored: true,
    timestamps: false,
  },
);
