import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface QrisSandboxTransactionAttributes {
  id: string;
  workspaceId: string;
  testRunId: string;
  testCaseId: string;
  idempotencyKey: string;
  amountMinor: 0;
  currency: 'IDR';
  status: 'pending' | 'paid' | 'failed' | 'expired';
  createdBy: string;
  simulatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type QrisSandboxTransactionCreationAttributes = Optional<
  QrisSandboxTransactionAttributes,
  'id' | 'status' | 'simulatedAt' | 'createdAt' | 'updatedAt'
>;

export class QrisSandboxTransactionModel
  extends Model<QrisSandboxTransactionAttributes, QrisSandboxTransactionCreationAttributes>
  implements QrisSandboxTransactionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testRunId: string;
  declare testCaseId: string;
  declare idempotencyKey: string;
  declare amountMinor: 0;
  declare currency: 'IDR';
  declare status: 'pending' | 'paid' | 'failed' | 'expired';
  declare createdBy: string;
  declare simulatedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

QrisSandboxTransactionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testRunId: { type: DataTypes.UUID, allowNull: false, field: 'test_run_id' },
    testCaseId: { type: DataTypes.UUID, allowNull: false, field: 'test_case_id' },
    idempotencyKey: { type: DataTypes.STRING(128), allowNull: false, field: 'idempotency_key' },
    amountMinor: { type: DataTypes.INTEGER, allowNull: false, field: 'amount_minor' },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    simulatedAt: { type: DataTypes.DATE, allowNull: true, field: 'simulated_at' },
  },
  {
    sequelize,
    tableName: 'qris_sandbox_transactions',
    underscored: true,
    timestamps: true,
  },
);
