import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  sent: boolean;
  messageId?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private appUrl: string;

  constructor(private readonly config: typeof env = env) {
    this.appUrl = config.APP_URL;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const {
      SMTP_HOST: host,
      SMTP_PORT: port,
      SMTP_SECURE: secure,
      SMTP_USER: user,
      SMTP_PASS: pass,
    } = this.config;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
    }
  }

  /** Sends an email when SMTP is configured. Email bodies are never logged. */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const from =
      this.config.SMTP_FROM || `"Qlick Hub" <${this.config.SMTP_USER || 'noreply@qlickhub.local'}>`;

    if (this.transporter && this.config.NODE_ENV !== 'test') {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]+>/g, ''),
        });
        return { sent: true, messageId: info.messageId };
      } catch (error) {
        console.error('[EmailService] SMTP delivery failed.', error);
        return { sent: false };
      }
    }

    console.warn('[EmailService] SMTP is not configured; email was not sent.');
    return { sent: false };
  }

  /**
   * Sends password reset link email.
   */
  async sendPasswordResetEmail(
    toEmail: string,
    token: string,
    userName?: string,
  ): Promise<EmailSendResult> {
    const resetUrl = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const greeting = userName ? `Hello ${userName},` : 'Hello,';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 18px; font-weight: bold; color: #0f172a;">Qlick Hub</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="font-size: 14px; line-height: 24px; color: #475569; margin-bottom: 24px;">
          ${greeting}<br />
          We received a request to reset your password. Click the button below to set a new password. This link is valid for 1 hour.
        </p>
        <div style="margin-bottom: 32px;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #22201F; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; line-height: 20px; color: #94a3b8; margin-bottom: 8px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="font-size: 12px; line-height: 20px; color: #94a3b8; word-break: break-all;">
          Or copy this link: <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: toEmail,
      subject: 'Reset your password - Qlick Hub',
      html,
    });
  }

  /**
   * Sends workspace invitation notice email.
   */
  async sendWorkspaceInvitationEmail(
    toEmail: string,
    workspaceNames: string[],
    inviterName: string,
    role: string,
    setPasswordToken?: string,
  ): Promise<EmailSendResult> {
    const loginUrl = `${this.appUrl}/login`;
    const setPasswordUrl = setPasswordToken
      ? `${this.appUrl}/reset-password?token=${encodeURIComponent(setPasswordToken)}`
      : null;
    const workspacesList = workspaceNames
      .map((name) => `<li style="margin-bottom: 6px; font-weight: 600;">${name}</li>`)
      .join('');
    const setPasswordNote = setPasswordUrl
      ? `<p style="font-size: 13px; line-height: 20px; color: #475569; margin-bottom: 16px;">
          Set your password before signing in. This one-time link is valid for 1 hour.
        </p>`
      : '';

    const inviteImageUrl =
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1788252213/ChatGPT_Image_Sep_1_2026_03_43_08_PM.png';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="margin-bottom: 24px; text-align: center;">
          <img src="${inviteImageUrl}" alt="Workspace Invitation" style="width: 100%; max-width: 512px; height: auto; border-radius: 12px; display: block; margin: 0 auto;" />
        </div>
        <div style="margin-bottom: 24px;">
          <span style="font-size: 18px; font-weight: bold; color: #0f172a;">Qlick Hub</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">You've been added to Workspace(s)</h2>
        <p style="font-size: 14px; line-height: 24px; color: #475569; margin-bottom: 16px;">
          <strong>${inviterName}</strong> has assigned you to the following workspace(s) with role <strong>${role.toUpperCase()}</strong>:
        </p>
        <ul style="font-size: 14px; color: #334155; margin-bottom: 24px; padding-left: 20px;">
          ${workspacesList}
        </ul>
        ${setPasswordNote}
        ${
          setPasswordUrl
            ? `<div style="margin-bottom: 16px;">
          <a href="${setPasswordUrl}" style="display: inline-block; background-color: #22201F; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
            Set Password
          </a>
        </div>`
            : ''
        }
        <div style="margin-bottom: 24px;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #22201F; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
            Open Work Hub
          </a>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: toEmail,
      subject: `You've been invited to ${workspaceNames.join(', ')}`,
      html,
    });
  }
}

export const emailService = new EmailService();
