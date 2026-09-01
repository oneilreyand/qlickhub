import assert from 'node:assert';
import { describe, test } from 'node:test';
import { EmailService, SendEmailOptions } from '../emailService.js';

describe('EmailService', () => {
  test('sendWorkspaceInvitationEmail includes banner image, workspace list, and login URL', async () => {
    const service = new EmailService();
    let sentOptions: SendEmailOptions | null = null;

    // Spy on sendEmail
    service.sendEmail = async (options: SendEmailOptions) => {
      sentOptions = options;
      return { sent: true };
    };

    const result = await service.sendWorkspaceInvitationEmail(
      'invitee@example.com',
      ['Core Platform', 'Analytics Hub'],
      'Alice Admin',
      'dev',
      true,
    );

    assert.strictEqual(result.sent, true);
    assert.notStrictEqual(sentOptions, null);
    if (!sentOptions) throw new Error('Expected sentOptions to be populated');

    const options: SendEmailOptions = sentOptions;
    assert.strictEqual(options.to, 'invitee@example.com');
    assert.strictEqual(options.subject, "You've been invited to Core Platform, Analytics Hub");
    assert.ok(
      options.html.includes(
        'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1788252213/ChatGPT_Image_Sep_1_2026_03_43_08_PM.png',
      ),
    );
    assert.ok(options.html.includes('Alice Admin'));
    assert.ok(options.html.includes('DEV'));
    assert.ok(options.html.includes('Core Platform'));
    assert.ok(options.html.includes('Analytics Hub'));
    assert.ok(options.html.includes('Password123!'));
    assert.ok(options.html.includes('/login'));
  });

  test('sendPasswordResetEmail includes reset URL and user greeting', async () => {
    const service = new EmailService();
    let sentOptions: SendEmailOptions | null = null;

    service.sendEmail = async (options: SendEmailOptions) => {
      sentOptions = options;
      return { sent: true };
    };

    const result = await service.sendPasswordResetEmail(
      'user@example.com',
      'reset-token-xyz',
      'Bob Builder',
    );

    assert.strictEqual(result.sent, true);
    assert.notStrictEqual(sentOptions, null);
    if (!sentOptions) throw new Error('Expected sentOptions to be populated');

    const options: SendEmailOptions = sentOptions;
    assert.strictEqual(options.to, 'user@example.com');
    assert.ok(options.html.includes('Hello Bob Builder,'));
    assert.ok(options.html.includes('reset-password?token=reset-token-xyz'));
  });
});
