import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import {
  createCredentialRecoveryRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from '../middleware/rateLimit.js';
import { authRouter } from '../../modules/auth/auth.routes.js';

async function startServer(
  handler: express.RequestHandler,
): Promise<{ server: Server; url: string }> {
  const app = express();
  app.post('/recover', handler, (_req, res) => {
    res.status(200).json({ data: { message: 'generic response' } });
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/recover` };
}

describe('Credential recovery rate limiting (audit E4)', () => {
  let enforced: { server: Server; url: string };
  let relaxed: { server: Server; url: string };

  before(async () => {
    enforced = await startServer(
      createCredentialRecoveryRateLimiter({
        identifier: 'forgot-password',
        windowMs: 60_000,
        productionLimit: 2,
        environment: 'production',
      }),
    );
    relaxed = await startServer(
      createCredentialRecoveryRateLimiter({
        identifier: 'reset-password',
        windowMs: 60_000,
        productionLimit: 1,
        environment: 'test',
      }),
    );
  });

  after(async () => {
    await new Promise<void>((resolve) => enforced.server.close(() => resolve()));
    await new Promise<void>((resolve) => relaxed.server.close(() => resolve()));
  });

  it('returns 429 with a generic RATE_LIMITED body after the production limit', async () => {
    const statuses: number[] = [];
    let lastBody: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(enforced.url, { method: 'POST' });
      statuses.push(response.status);
      lastBody = await response.json();
    }
    assert.deepStrictEqual(statuses, [200, 200, 429]);
    assert.deepStrictEqual(lastBody, {
      code: 'RATE_LIMITED',
      message: 'Too many password recovery attempts. Please wait before trying again.',
    });
  });

  it('does not throttle outside production or Vercel deployments', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await fetch(relaxed.url, { method: 'POST' })).status);
    }
    assert.deepStrictEqual(statuses, [200, 200, 200]);
  });

  it('wires the limiters into the forgot-password and reset-password routes', () => {
    type Layer = { route?: { path: string; stack: { handle: unknown }[] } };
    const routeHandlers = (path: string) =>
      (authRouter.stack as Layer[])
        .find((layer) => layer.route?.path === path)
        ?.route?.stack.map((entry) => entry.handle) ?? [];
    assert.ok(routeHandlers('/forgot-password').includes(forgotPasswordRateLimiter));
    assert.ok(routeHandlers('/reset-password').includes(resetPasswordRateLimiter));
  });
});
