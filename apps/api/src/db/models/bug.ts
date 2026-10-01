import { DataTypes, Model, Optional } from 'sequelize';
import type { BugEnvironment, BugSeverity, BugStatus } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface BugAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  requirementId: string;
  testResultId?: string | null;
  environment: BugEnvironment;
  assigneeId: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  reproductionDetails: string;
  resolutionNotes?: string | null;
  createdBy: string;
  resolvedAt?: Date | null;
  verifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type BugCreationAttributes = Optional<
  BugAttributes,
  | 'id'
  | 'status'
  | 'testResultId'
  | 'environment'
  | 'resolutionNotes'
  | 'resolvedAt'
  | 'verifiedAt'
  | 'createdAt'
  | 'updatedAt'
>;

export class BugModel extends Model<BugAttributes, BugCreationAttributes> implements BugAttributes {
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare requirementId: string;
  declare testResultId: string | null;
  declare environment: BugEnvironment;
  declare assigneeId: string;
  declare title: string;
  declare severity: BugSeverity;
  declare status: BugStatus;
  declare reproductionDetails: string;
  declare resolutionNotes: string | null;
  declare createdBy: string;
  declare resolvedAt: Date | null;
  declare verifiedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BugModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    requirementId: { type: DataTypes.UUID, allowNull: false, field: 'requirement_id' },
    testResultId: { type: DataTypes.UUID, allowNull: true, field: 'test_result_id' },
    environment: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'staging',
      field: 'environment',
    },
    assigneeId: { type: DataTypes.UUID, allowNull: false, field: 'assignee_id' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    severity: { type: DataTypes.STRING(32), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'open' },
    reproductionDetails: { type: DataTypes.TEXT, allowNull: false, field: 'reproduction_details' },
    resolutionNotes: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_notes' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    verifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'verified_at' },
  },
  {
    sequelize,
    tableName: 'bugs',
    underscored: true,
    timestamps: true,
  },
);
