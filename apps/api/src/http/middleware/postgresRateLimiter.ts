import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import type {
  DistributedRateLimiter,
  DistributedRateLimitResult,
} from './distributedRateLimitStore.js';

export class PostgresRateLimiter implements DistributedRateLimiter {
  private readonly lockTimeoutMs: number;
  private readonly statementTimeoutMs: number;

  constructor(
    private readonly database: Sequelize,
    private readonly options: {
      limit: number;
      windowMs: number;
      lockTimeoutMs?: number;
      statementTimeoutMs?: number;
    },
  ) {
    if (
      !Number.isInteger(options.limit) ||
      options.limit < 1 ||
      options.limit > 500 ||
      !Number.isInteger(options.windowMs) ||
      options.windowMs < 1 ||
      options.windowMs > 86_400_000
    ) {
      throw new Error('Invalid PostgreSQL rate-limit options');
    }
    this.lockTimeoutMs = options.lockTimeoutMs ?? 5_000;
    this.statementTimeoutMs = options.statementTimeoutMs ?? 8_000;
    if (
      !Number.isInteger(this.lockTimeoutMs) ||
      this.lockTimeoutMs < 1 ||
      !Number.isInteger(this.statementTimeoutMs) ||
      this.statementTimeoutMs <= this.lockTimeoutMs
    ) {
      throw new Error('Invalid PostgreSQL rate-limit timeout options');
    }
  }

  async limit(identifier: string): Promise<DistributedRateLimitResult> {
    if (!/^[a-f0-9]{64}$/.test(identifier)) throw new Error('Invalid opaque rate-limit identifier');
    // Reuse the application pool. Await rollback on SQL timeout before the store
    // invokes its approved local fallback; never leave a detached SQL mutation.
    return this.database.transaction(
      {
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        logging: false,
      },
      async (transaction) => {
        await this.database.query(
          "SELECT set_config('lock_timeout', $1, true), set_config('statement_timeout', $2, true)",
          {
            bind: [`${this.lockTimeoutMs}ms`, `${this.statementTimeoutMs}ms`],
            transaction,
            logging: false,
          },
        );
        const [result] = await this.database.query<{
          allowed: boolean;
          remaining: number;
          reset_ms: number;
        }>('SELECT * FROM public.consume_link_preview_rate_limit($1, $2, $3)', {
          bind: [identifier, this.options.limit, this.options.windowMs],
          type: QueryTypes.SELECT,
          transaction,
          logging: false,
          retry: { max: 0 },
        });
        if (
          !result ||
          typeof result.allowed !== 'boolean' ||
          !Number.isSafeInteger(result.remaining) ||
          result.remaining < 0 ||
          result.remaining > this.options.limit ||
          !Number.isFinite(result.reset_ms)
        ) {
          throw new Error('Invalid PostgreSQL rate-limit result');
        }
        return {
          success: result.allowed,
          limit: this.options.limit,
          remaining: result.remaining,
          reset: result.reset_ms,
        };
      },
    );
  }
}
