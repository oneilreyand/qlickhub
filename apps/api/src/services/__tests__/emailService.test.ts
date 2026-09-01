import assert from 'node:assert';
import { describe, test } from 'node:test';
import { env } from '../../config/env.js';
import { EmailService } from '../emailService.js';

describe('EmailService', () => {
  test('does not expose a reset link through a local logging fallback', async () => {
    const service = new EmailService({
      ...env,
      NODE_ENV: 'test',
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
    });
    const warning = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...args: unknown[]) => calls.push(args);

    try {
      const result = await service.sendEmail({
        to: 'member@example.com',
        subject: 'Reset password',
        html: '<p>https://example.test/reset-password?token=sensitive-token</p>',
      });

      assert.deepStrictEqual(result, { sent: false });
      assert.deepStrictEqual(calls, [
        ['[EmailService] SMTP is not configured; email was not sent.'],
      ]);
    } finally {
      console.warn = warning;
    }
  });
});
