import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import type {
  DistributedRateLimiter,
  DistributedRateLimitResult,
} from './distributedRateLimitStore.js';

export class PostgresRateLimiter implements DistributedRateLimiter {
  constructor(
    private readonly database: Sequelize,
    private readonly options: { limit: number; windowMs: number },
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
          "SET LOCAL lock_timeout = '750ms'; SET LOCAL statement_timeout = '1500ms';",
          {
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
