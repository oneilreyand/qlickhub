import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestCaseImportRowAttributes {
  id: string;
  importId: string;
  sourceRowNumber: number;
  externalReference?: string | null;
  parsedPayload: Record<string, unknown>;
  outcome: 'created' | 'updated' | 'skipped' | 'failed';
  validationErrors?: unknown[] | null;
  testCaseId?: string | null;
  createdAt?: Date;
}

type TestCaseImportRowCreationAttributes = Optional<
  TestCaseImportRowAttributes,
  'id' | 'externalReference' | 'validationErrors' | 'testCaseId' | 'createdAt'
>;

export class TestCaseImportRowModel
  extends Model<TestCaseImportRowAttributes, TestCaseImportRowCreationAttributes>
  implements TestCaseImportRowAttributes
{
  declare id: string;
  declare importId: string;
  declare sourceRowNumber: number;
  declare externalReference: string | null;
  declare parsedPayload: Record<string, unknown>;
  declare outcome: 'created' | 'updated' | 'skipped' | 'failed';
  declare validationErrors: unknown[] | null;
  declare testCaseId: string | null;
  declare readonly createdAt: Date;
}

TestCaseImportRowModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    importId: { type: DataTypes.UUID, allowNull: false, field: 'import_id' },
    sourceRowNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'source_row_number' },
    externalReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'external_reference',
    },
    parsedPayload: { type: DataTypes.JSONB, allowNull: false, field: 'parsed_payload' },
    outcome: { type: DataTypes.STRING(32), allowNull: false },
    validationErrors: { type: DataTypes.JSONB, allowNull: true, field: 'validation_errors' },
    testCaseId: { type: DataTypes.UUID, allowNull: true, field: 'test_case_id' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'test_case_import_rows',
    underscored: true,
    timestamps: false,
  },
);
