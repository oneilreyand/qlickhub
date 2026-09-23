import type {
  CreateQrisSandboxTransactionInput,
  QrisSandboxTransaction,
  SimulateQrisSandboxStatusInput,
} from '@qlick/contracts';
import { sequelize } from '../../db/sequelize.js';
import { QrisSandboxTransactionModel, TestRunModel } from '../../db/models/index.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import {
  assertCanExecuteTestRun,
  assertCanReadTestManagement,
} from '../../policies/testManagementPolicy.js';
import { iso } from '../../utils/dateUtils.js';

const SANDBOX_CANDIDATE_PREFIX = 'sandbox:qris:';

function formatTransaction(transaction: QrisSandboxTransactionModel): QrisSandboxTransaction {
  return {
    id: transaction.id,
    workspaceId: transaction.workspaceId,
    testRunId: transaction.testRunId,
    testCaseId: transaction.testCaseId,
    idempotencyKey: transaction.idempotencyKey,
    amountMinor: 0,
    currency: 'IDR',
    status: transaction.status,
    sandboxReference: `qris-sbx-${transaction.id}`,
    isNonFinancial: true,
    createdBy: transaction.createdBy,
    simulatedAt: transaction.simulatedAt ? iso(transaction.simulatedAt) : null,
    createdAt: iso(transaction.createdAt),
    updatedAt: iso(transaction.updatedAt),
  };
}

export class QrisSandboxService {
  async createTransaction(
    actorId: string,
    input: CreateQrisSandboxTransactionInput,
  ): Promise<QrisSandboxTransaction> {
    return sequelize.transaction(async (transaction) => {
      const member = await requireActiveMember(input.workspaceId, actorId, transaction);
      assertCanExecuteTestRun(member.role);

      const run = await TestRunModel.findOne({
        where: { id: input.testRunId, workspaceId: input.workspaceId, executorId: actorId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!run) {
        throw new Error('NOT_FOUND: Active QA Test Run not found in this workspace.');
      }
      if (run.status !== 'in_progress') {
        throw new Error('CONFLICT: A sandbox transaction requires an in-progress Test Run.');
      }
      if (!run.candidateFingerprint?.startsWith(SANDBOX_CANDIDATE_PREFIX)) {
        throw new Error('CONFLICT: Test Run must use a nonfinancial QRIS sandbox candidate.');
      }

      const existing = await QrisSandboxTransactionModel.findOne({
        where: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) {
        if (
          existing.testRunId !== input.testRunId ||
          existing.amountMinor !== input.amountMinor ||
          existing.currency !== input.currency
        ) {
          throw new Error('CONFLICT: Idempotency key is already bound to another sandbox request.');
        }
        return formatTransaction(existing);
      }

      const created = await QrisSandboxTransactionModel.create(
        {
          workspaceId: input.workspaceId,
          testRunId: run.id,
          testCaseId: run.testCaseId,
          idempotencyKey: input.idempotencyKey,
          amountMinor: 0,
          currency: 'IDR',
          status: 'pending',
          createdBy: actorId,
        },
        { transaction },
      );
      return formatTransaction(created);
    });
  }

  async getTransaction(workspaceId: string, transactionId: string, actorId: string) {
    const member = await requireActiveMember(workspaceId, actorId);
    assertCanReadTestManagement(member.role);
    const transaction = await QrisSandboxTransactionModel.findOne({
      where: { id: transactionId, workspaceId },
    });
    if (!transaction) throw new Error('NOT_FOUND: QRIS sandbox transaction not found.');
    return formatTransaction(transaction);
  }

  async simulateStatus(
    actorId: string,
    workspaceId: string,
    transactionId: string,
    input: SimulateQrisSandboxStatusInput,
  ): Promise<QrisSandboxTransaction> {
    return sequelize.transaction(async (dbTransaction) => {
      const member = await requireActiveMember(workspaceId, actorId, dbTransaction);
      assertCanExecuteTestRun(member.role);
      const transaction = await QrisSandboxTransactionModel.findOne({
        where: { id: transactionId, workspaceId, createdBy: actorId },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });
      if (!transaction) throw new Error('NOT_FOUND: QRIS sandbox transaction not found.');
      if (transaction.status !== 'pending') {
        if (transaction.status === input.status) return formatTransaction(transaction);
        throw new Error('CONFLICT: A sandbox transaction has already reached a final status.');
      }
      await transaction.update(
        { status: input.status, simulatedAt: new Date() },
        { transaction: dbTransaction },
      );
      return formatTransaction(transaction);
    });
  }
}

export const qrisSandboxService = new QrisSandboxService();
