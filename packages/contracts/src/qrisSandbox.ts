import { z } from 'zod';

export const QrisSandboxTransactionStatusSchema = z.enum(['pending', 'paid', 'failed', 'expired']);
export type QrisSandboxTransactionStatus = z.infer<typeof QrisSandboxTransactionStatusSchema>;

export const CreateQrisSandboxTransactionSchema = z.object({
  workspaceId: z.string().uuid(),
  testRunId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(128),
  amountMinor: z.literal(0),
  currency: z.literal('IDR'),
});
export type CreateQrisSandboxTransactionInput = z.infer<typeof CreateQrisSandboxTransactionSchema>;

export const SimulateQrisSandboxStatusSchema = z.object({
  status: z.enum(['paid', 'failed', 'expired']),
});
export type SimulateQrisSandboxStatusInput = z.infer<typeof SimulateQrisSandboxStatusSchema>;

export const QrisSandboxTransactionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  testRunId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(128),
  amountMinor: z.literal(0),
  currency: z.literal('IDR'),
  status: QrisSandboxTransactionStatusSchema,
  sandboxReference: z.string().min(1).max(128),
  isNonFinancial: z.literal(true),
  createdBy: z.string().uuid(),
  simulatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type QrisSandboxTransaction = z.infer<typeof QrisSandboxTransactionSchema>;
