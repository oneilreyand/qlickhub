import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export type TestResultEvidenceManifestKind = 'initial' | 'supplement';

export interface TestResultEvidenceManifestAttributes {
  id: string;
  workspaceId: string;
  testResultId: string;
  sequence: number;
  kind: TestResultEvidenceManifestKind;
  reason?: string | null;
  itemCount: number;
  imageCount: number;
  videoCount: number;
  readyCount: number;
  evidenceSnapshot: unknown[];
  sealedBy: string;
  sealedAt?: Date;
}

type TestResultEvidenceManifestCreationAttributes = Optional<
  TestResultEvidenceManifestAttributes,
  'id' | 'sealedAt'
>;

/**
 * A sealed, append-only record of the evidence that supported a Test Result.
 * Subsequent evidence is represented by a new `supplement` row rather than an
 * update to the original manifest.
 */
export class TestResultEvidenceManifestModel
  extends Model<TestResultEvidenceManifestAttributes, TestResultEvidenceManifestCreationAttributes>
  implements TestResultEvidenceManifestAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testResultId: string;
  declare sequence: number;
  declare kind: TestResultEvidenceManifestKind;
  declare reason: string | null;
  declare itemCount: number;
  declare imageCount: number;
  declare videoCount: number;
  declare readyCount: number;
  declare evidenceSnapshot: unknown[];
  declare sealedBy: string;
  declare readonly sealedAt: Date;
}

TestResultEvidenceManifestModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testResultId: { type: DataTypes.UUID, allowNull: false, field: 'test_result_id' },
    sequence: { type: DataTypes.INTEGER, allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    itemCount: { type: DataTypes.INTEGER, allowNull: false, field: 'item_count' },
    imageCount: { type: DataTypes.INTEGER, allowNull: false, field: 'image_count' },
    videoCount: { type: DataTypes.INTEGER, allowNull: false, field: 'video_count' },
    readyCount: { type: DataTypes.INTEGER, allowNull: false, field: 'ready_count' },
    evidenceSnapshot: { type: DataTypes.JSONB, allowNull: false, field: 'evidence_snapshot' },
    sealedBy: { type: DataTypes.UUID, allowNull: false, field: 'sealed_by' },
    sealedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'sealed_at',
    },
  },
  {
    sequelize,
    tableName: 'test_result_evidence_manifests',
    underscored: true,
    timestamps: false,
  },
);
