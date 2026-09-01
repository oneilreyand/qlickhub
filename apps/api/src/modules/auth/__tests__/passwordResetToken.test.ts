import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  passwordResetTokenTtlMs,
} from '../passwordResetToken.js';

describe('password reset tokens', () => {
  test('stores a deterministic SHA-256 hash instead of the bearer token', () => {
    const reset = createPasswordResetToken(1_000);

    assert.match(reset.token, /^[a-f0-9]{64}$/);
    assert.match(reset.tokenHash, /^[a-f0-9]{64}$/);
    assert.notStrictEqual(reset.tokenHash, reset.token);
    assert.strictEqual(reset.tokenHash, hashPasswordResetToken(reset.token));
    assert.strictEqual(reset.expiresAt.getTime(), 1_000 + passwordResetTokenTtlMs);
  });
});
