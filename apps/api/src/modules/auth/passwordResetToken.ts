import crypto from 'node:crypto';

export const passwordResetTokenTtlMs = 60 * 60 * 1000;

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetToken(now = Date.now()) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now + passwordResetTokenTtlMs),
  };
}
