import assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { createApp } from '../../../app.js';
import { UserModel } from '../../../db/models/index.js';
import { signToken, accessTokenCookieName } from '../jwt.js';
import { sessionManager } from '../sessionManager.js';
import { Server } from 'node:http';

describe('User Onboarding API Suite', () => {
  let appServer: Server;
  let baseUrl: string;

  let testUser: UserModel;
  let userCookie: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const address = appServer.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}/v1`;
        }
        resolve();
      });
    });

    const timestamp = Date.now();
    testUser = await UserModel.create({
      email: `onboard_user_${timestamp}@test.com`,
      name: 'Onboard Test User',
      role: 'dev',
      passwordHash: 'dummy',
    });

    const sessionId = await sessionManager.createSession(testUser.id, 'TestAgent', '127.0.0.1');
    const token = signToken({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
      sessionId,
    });
    userCookie = `${accessTokenCookieName}=${token}`;
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }
  });

  test('GET /v1/auth/session returns null onboardingCompletedAt for fresh user', async () => {
    const res = await fetch(`${baseUrl}/auth/session`, {
      headers: {
        Cookie: userCookie,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.data.user.id, testUser.id);
    assert.strictEqual(body.data.user.onboardingCompletedAt, null);
  });

  test('POST /v1/auth/onboarding/complete requires authentication', async () => {
    const res = await fetch(`${baseUrl}/auth/onboarding/complete`, {
      method: 'POST',
    });

    assert.strictEqual(res.status, 401);
  });

  test('POST /v1/auth/onboarding/complete updates onboardingCompletedAt timestamp', async () => {
    const res = await fetch(`${baseUrl}/auth/onboarding/complete`, {
      method: 'POST',
      headers: {
        Cookie: userCookie,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.data.success, true);
    assert.ok(body.data.onboardingCompletedAt);
    assert.ok(body.data.user.onboardingCompletedAt);

    // Verify session reflection
    const sessionRes = await fetch(`${baseUrl}/auth/session`, {
      headers: {
        Cookie: userCookie,
      },
    });
    const sessionBody = (await sessionRes.json()) as any;
    assert.strictEqual(sessionBody.data.user.onboardingCompletedAt, body.data.onboardingCompletedAt);
  });

  test('POST /v1/auth/onboarding/reset sets onboardingCompletedAt back to null', async () => {
    const res = await fetch(`${baseUrl}/auth/onboarding/reset`, {
      method: 'POST',
      headers: {
        Cookie: userCookie,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.data.success, true);
    assert.strictEqual(body.data.onboardingCompletedAt, null);
    assert.strictEqual(body.data.user.onboardingCompletedAt, null);

    const sessionRes = await fetch(`${baseUrl}/auth/session`, {
      headers: {
        Cookie: userCookie,
      },
    });
    const sessionBody = (await sessionRes.json()) as any;
    assert.strictEqual(sessionBody.data.user.onboardingCompletedAt, null);
  });
});
