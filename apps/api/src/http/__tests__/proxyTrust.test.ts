import assert from 'node:assert';
import { test } from 'node:test';
import express, { Request, RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

import { configureProxyTrust } from '../middleware/proxyTrust.js';

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

test('trusts exactly one Vercel proxy hop so forwarded requests reach rate limiters', async () => {
  const app = express();
  configureProxyTrust(app, true);

  assert.strictEqual(app.get('trust proxy'), 1);

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 2,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }) as unknown as RequestHandler,
  );
  app.get('/probe', (_req: Request, res: Response) => res.status(200).json({ ok: true }));

  const server = await listen(app);
  try {
    const response = await fetch(`${server.baseUrl}/probe`, {
      headers: {
        'x-forwarded-for': '203.0.113.10',
        forwarded: 'for=203.0.113.10;proto=https',
      },
    });

    assert.strictEqual(response.status, 200);
    assert.ok(response.headers.get('ratelimit'));
  } finally {
    await server.close();
  }
});

test('does not trust proxy headers outside Vercel', () => {
  const app = express();
  configureProxyTrust(app, false);

  assert.strictEqual(app.get('trust proxy'), false);
});
