import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { createApp } from '../../../app.js';
import { AuthSessionModel, UserModel } from '../../../db/models/index.js';
import { emailService } from '../../../services/emailService.js';
import { hashPasswordResetToken } from '../passwordResetToken.js';
import { sessionManager } from '../sessionManager.js';

describe('Password reset HTTP/PostgreSQL integration', () => {
  let server: Server;
  let baseUrl: string;
  let user: UserModel;
  let dispatchedToken: string | undefined;
  const originalSendPasswordResetEmail = emailService.sendPasswordResetEmail.bind(emailService);

  before(async () => {
    emailService.sendPasswordResetEmail = async (_email, token) => {
      dispatchedToken = token;
      return { sent: true };
    };
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });
    user = await UserModel.create({
      email: `password-reset-${Date.now()}@example.com`,
      name: 'Password Reset User',
      role: 'dev',
      passwordHash: await bcrypt.hash('Original-password-123!', 10),
    });
  });

  after(async () => {
    emailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (user) {
      await AuthSessionModel.destroy({ where: { userId: user.id } });
      await user.destroy({ force: true });
    }
  });

  test('stores only the token hash, permits one concurrent reset, and revokes every session', async () => {
    const forgot = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });
    assert.strictEqual(forgot.status, 200);
    assert.ok(dispatchedToken);

    const persistedAfterForgot = await UserModel.findByPk(user.id);
    assert.ok(persistedAfterForgot);
    assert.strictEqual(
      persistedAfterForgot.passwordResetToken,
      hashPasswordResetToken(dispatchedToken),
    );
    assert.notStrictEqual(persistedAfterForgot.passwordResetToken, dispatchedToken);
    assert.ok(persistedAfterForgot.passwordResetExpiresAt);

    const activeSessionIds = await Promise.all([
      sessionManager.createSession(user.id, 'Reset device one', '127.0.0.1'),
      sessionManager.createSession(user.id, 'Reset device two', '127.0.0.2'),
    ]);

    const candidatePasswords = ['Replacement-password-123!', 'Concurrent-password-456!'];
    const resetResponses = await Promise.all(
      candidatePasswords.map((newPassword) =>
        fetch(`${baseUrl}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: dispatchedToken, newPassword }),
        }),
      ),
    );
    assert.deepStrictEqual(resetResponses.map((response) => response.status).sort(), [200, 400]);

    const persistedAfterReset = await UserModel.findByPk(user.id);
    assert.ok(persistedAfterReset);
    assert.strictEqual(persistedAfterReset.passwordResetToken, null);
    assert.strictEqual(persistedAfterReset.passwordResetExpiresAt, null);
    assert.ok(persistedAfterReset.passwordHash);
    const winningPasswordMatches = await Promise.all(
      candidatePasswords.map((candidate) =>
        bcrypt.compare(candidate, persistedAfterReset.passwordHash!),
      ),
    );
    assert.strictEqual(winningPasswordMatches.filter(Boolean).length, 1);

    for (const sessionId of activeSessionIds) {
      assert.strictEqual((await sessionManager.isSessionActive(user.id, sessionId)).active, false);
    }

    const replay = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: dispatchedToken, newPassword: 'Another-password-123!' }),
    });
    assert.strictEqual(replay.status, 400);
  });
});
