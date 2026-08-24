import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestCaseAttributes {
  id: string;
  workspaceId: string;
  externalReference?: string | null;
  title: string;
  description?: string | null;
  testType: 'manual' | 'e2e' | 'integration' | 'unit';
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'in_review' | 'active' | 'archived';
  preconditions?: string | null;
  steps: string[];
  expectedResult?: string | null;
  testData?: string | null;
  scenarioKind: 'positive' | 'negative';
  source: 'native' | 'spreadsheet_import';
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type TestCaseCreationAttributes = Optional<
  TestCaseAttributes,
  | 'id'
  | 'externalReference'
  | 'description'
  | 'testType'
  | 'priority'
  | 'status'
  | 'preconditions'
  | 'steps'
  | 'expectedResult'
  | 'testData'
  | 'scenarioKind'
  | 'source'
  | 'createdAt'
  | 'updatedAt'
>;

export class TestCaseModel
  extends Model<TestCaseAttributes, TestCaseCreationAttributes>
  implements TestCaseAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare externalReference: string | null;
  declare title: string;
  declare description: string | null;
  declare testType: 'manual' | 'e2e' | 'integration' | 'unit';
  declare priority: 'high' | 'medium' | 'low';
  declare status: 'draft' | 'in_review' | 'active' | 'archived';
  declare preconditions: string | null;
  declare steps: string[];
  declare expectedResult: string | null;
  declare testData: string | null;
  declare scenarioKind: 'positive' | 'negative';
  declare source: 'native' | 'spreadsheet_import';
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TestCaseModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    externalReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'external_reference',
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    testType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'manual',
      field: 'test_type',
    },
    priority: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'medium' },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'draft' },
    preconditions: { type: DataTypes.TEXT, allowNull: true },
    steps: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'steps_json' },
    expectedResult: { type: DataTypes.TEXT, allowNull: true, field: 'expected_result' },
    testData: { type: DataTypes.TEXT, allowNull: true, field: 'test_data' },
    scenarioKind: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'positive',
      field: 'scenario_kind',
    },
    source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'native' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  },
  {
    sequelize,
    tableName: 'test_cases',
    underscored: true,
    timestamps: true,
  },
);
