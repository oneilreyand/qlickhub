import assert from 'node:assert';
import { describe, test } from 'node:test';
import express, { Request, Response } from 'express';

import type {
  DistributedRateLimiter,
  DistributedRateLimitResult,
} from '../middleware/distributedRateLimitStore.js';
import { createLinkPreviewRateLimiter } from '../middleware/rateLimit.js';

class SharedDistributedLimiter implements DistributedRateLimiter {
  readonly seenIdentifiers: string[] = [];
  private readonly counts = new Map<string, number>();

  constructor(
    private readonly limitValue: number,
    private readonly failure: 'none' | 'throw' | 'timeout' = 'none',
  ) {}

  async limit(identifier: string): Promise<DistributedRateLimitResult> {
    this.seenIdentifiers.push(identifier);

    if (this.failure === 'throw') throw new Error('test provider credential must not be logged');

    if (this.failure === 'timeout') {
      return {
        success: true,
        limit: this.limitValue,
        remaining: this.limitValue,
        reset: Date.now() + 60_000,
        reason: 'timeout',
      };
    }

    const count = (this.counts.get(identifier) ?? 0) + 1;
    this.counts.set(identifier, count);
    return {
      success: count <= this.limitValue,
      limit: this.limitValue,
      remaining: Math.max(0, this.limitValue - count),
      reset: Date.now() + 60_000,
    };
  }

  async resetUsedTokens(identifier: string): Promise<void> {
    this.counts.delete(identifier);
  }
}

async function listen(app: express.Express): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('distributed link-preview rate limiting (SEC-001)', () => {
  test('shares an opaque per-user bucket across independent middleware instances', async () => {
    const distributedLimiter = new SharedDistributedLimiter(30);
    const commonOptions = {
      limit: 30,
      windowMs: 60_000,
      skip: () => false,
      store: 'upstash' as const,
      distributedLimiter,
      identifierSecret: 'test-only-distributed-identifier-secret',
    };
    const app = express();
    app.use((req: any, _res, next) => {
      req.user = { userId: req.headers['x-test-user-id'] ?? 'user-alpha' };
      next();
    });
    app.get('/instance-a', createLinkPreviewRateLimiter(commonOptions), okResponse);
    app.get('/instance-b', createLinkPreviewRateLimiter(commonOptions), okResponse);
    const server = await listen(app);

    try {
      for (let requestIndex = 0; requestIndex < 30; requestIndex += 1) {
        const instance = requestIndex % 2 === 0 ? 'instance-a' : 'instance-b';
        assert.strictEqual((await fetch(`${server.baseUrl}/${instance}`)).status, 200);
      }

      const blocked = await fetch(`${server.baseUrl}/instance-b`);
      assert.strictEqual(blocked.status, 429);
      const blockedBody = (await blocked.json()) as { code?: string };
      assert.strictEqual(blockedBody.code, 'RATE_LIMITED');
      assert.ok(blocked.headers.get('ratelimit'));
      assert.ok(blocked.headers.get('ratelimit-policy'));

      const otherUser = await fetch(`${server.baseUrl}/instance-b`, {
        headers: { 'x-test-user-id': 'user-beta' },
      });
      assert.strictEqual(otherUser.status, 200);

      assert.ok(distributedLimiter.seenIdentifiers.length >= 32);
      for (const identifier of distributedLimiter.seenIdentifiers) {
        assert.match(identifier, /^[a-f0-9]{64}$/);
        assert.ok(!identifier.includes('user-alpha'));
        assert.ok(!identifier.includes('user-beta'));
      }
    } finally {
      await server.close();
    }
  });

  for (const failure of ['throw', 'timeout'] as const) {
    test(`uses the local limiter and one sanitized warning on provider ${failure}`, async () => {
      const distributedLimiter = new SharedDistributedLimiter(2, failure);
      let warningCount = 0;
      const app = express();
      app.get(
        '/fallback',
        createLinkPreviewRateLimiter({
          limit: 2,
          windowMs: 60_000,
          skip: () => false,
          store: 'upstash',
          distributedLimiter,
          identifierSecret: 'test-only-distributed-identifier-secret',
          onStoreFailure: () => {
            warningCount += 1;
          },
        }),
        okResponse,
      );
      const server = await listen(app);

      try {
        assert.strictEqual((await fetch(`${server.baseUrl}/fallback`)).status, 200);
        assert.strictEqual((await fetch(`${server.baseUrl}/fallback`)).status, 200);
        assert.strictEqual((await fetch(`${server.baseUrl}/fallback`)).status, 429);
        assert.strictEqual(warningCount, 1);
        for (const identifier of distributedLimiter.seenIdentifiers) {
          assert.match(identifier, /^[a-f0-9]{64}$/);
          assert.ok(!identifier.includes('127.0.0.1'));
        }
      } finally {
        await server.close();
      }
    });
  }
});

function okResponse(_req: Request, res: Response): void {
  res.status(200).json({ ok: true });
}
