import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export type TestCaseVersionOrigin = 'legacy_backfill' | 'native_revision';

export interface TestCaseVersionAttributes {
  id: string;
  workspaceId: string;
  testCaseId: string;
  revision: number;
  lifecycleStatus: 'draft' | 'in_review' | 'active' | 'archived';
  definitionSnapshot: Record<string, unknown>;
  authoredBy: string;
  publishedBy?: string | null;
  publishedAt?: Date | null;
  supersedesVersionId?: string | null;
  origin: TestCaseVersionOrigin;
  createdAt?: Date;
}

type TestCaseVersionCreationAttributes = Optional<
  TestCaseVersionAttributes,
  'id' | 'publishedBy' | 'publishedAt' | 'supersedesVersionId' | 'origin' | 'createdAt'
>;

export class TestCaseVersionModel
  extends Model<TestCaseVersionAttributes, TestCaseVersionCreationAttributes>
  implements TestCaseVersionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testCaseId: string;
  declare revision: number;
  declare lifecycleStatus: 'draft' | 'in_review' | 'active' | 'archived';
  declare definitionSnapshot: Record<string, unknown>;
  declare authoredBy: string;
  declare publishedBy: string | null;
  declare publishedAt: Date | null;
  declare supersedesVersionId: string | null;
  declare origin: TestCaseVersionOrigin;
  declare readonly createdAt: Date;
}

TestCaseVersionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testCaseId: { type: DataTypes.UUID, allowNull: false, field: 'test_case_id' },
    revision: { type: DataTypes.INTEGER, allowNull: false },
    lifecycleStatus: { type: DataTypes.STRING(32), allowNull: false, field: 'lifecycle_status' },
    definitionSnapshot: { type: DataTypes.JSONB, allowNull: false, field: 'definition_snapshot' },
    authoredBy: { type: DataTypes.UUID, allowNull: false, field: 'authored_by' },
    publishedBy: { type: DataTypes.UUID, allowNull: true, field: 'published_by' },
    publishedAt: { type: DataTypes.DATE, allowNull: true, field: 'published_at' },
    supersedesVersionId: { type: DataTypes.UUID, allowNull: true, field: 'supersedes_version_id' },
    origin: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'native_revision' },
  },
  {
    sequelize,
    tableName: 'test_case_versions',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
