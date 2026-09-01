import { DataTypes, Model, Optional } from 'sequelize';
import type { ReadinessSnapshot, ReleaseDecisionOutcome } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

import type { ReleaseDecisionCancellationModel } from './releaseDecisionCancellation.js';

export interface ReleaseDecisionAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  qaSignOffId: string;
  decision: ReleaseDecisionOutcome;
  notes?: string | null;
  overrideReason?: string | null;
  readinessSnapshot: ReadinessSnapshot;
  decidedBy: string;
  decidedAt?: Date;
  cancellation?: ReleaseDecisionCancellationModel | null;
}

type ReleaseDecisionCreationAttributes = Optional<
  ReleaseDecisionAttributes,
  'id' | 'notes' | 'overrideReason' | 'decidedAt' | 'cancellation'
>;

export class ReleaseDecisionModel
  extends Model<ReleaseDecisionAttributes, ReleaseDecisionCreationAttributes>
  implements ReleaseDecisionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare qaSignOffId: string;
  declare decision: ReleaseDecisionOutcome;
  declare notes: string | null;
  declare overrideReason: string | null;
  declare readinessSnapshot: ReadinessSnapshot;
  declare decidedBy: string;
  declare readonly decidedAt: Date;
  declare cancellation?: ReleaseDecisionCancellationModel | null;
}

ReleaseDecisionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    qaSignOffId: { type: DataTypes.UUID, allowNull: false, field: 'qa_sign_off_id' },
    decision: { type: DataTypes.STRING(32), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    overrideReason: { type: DataTypes.TEXT, allowNull: true, field: 'override_reason' },
    readinessSnapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'readiness_snapshot_json',
    },
    decidedBy: { type: DataTypes.UUID, allowNull: false, field: 'decided_by' },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'decided_at',
    },
  },
  {
    sequelize,
    tableName: 'release_decisions',
    underscored: true,
    timestamps: false,
  },
);
