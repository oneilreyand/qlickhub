import type { QrisSandboxTransaction, QrisSandboxTransactionStatus } from '@qlick/contracts';
import { apiClient } from './apiClient';

export const qrisSandboxService = {
  async createTransaction(
    workspaceId: string,
    input: {
      testRunId: string;
      idempotencyKey: string;
      amountMinor: 0;
      currency: 'IDR';
    },
  ): Promise<QrisSandboxTransaction> {
    const response = await apiClient<{ transaction: QrisSandboxTransaction }>(
      `/workspaces/${workspaceId}/qa-sandbox/qris/transactions`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return response.transaction;
  },

  async simulateStatus(
    workspaceId: string,
    transactionId: string,
    status: Exclude<QrisSandboxTransactionStatus, 'pending'>,
  ): Promise<QrisSandboxTransaction> {
    const response = await apiClient<{ transaction: QrisSandboxTransaction }>(
      `/workspaces/${workspaceId}/qa-sandbox/qris/transactions/${transactionId}/simulate-status`,
      { method: 'POST', body: JSON.stringify({ status }) },
    );
    return response.transaction;
  },
};
