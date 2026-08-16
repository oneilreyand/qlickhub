import { CookieOptions, Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { accessTokenCookieName, signToken } from './jwt.js';
import { sessionManager } from './sessionManager.js';
import {
  LoginRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ChangePasswordRequestSchema,
  UpdateProfileRequestSchema,
  AdminResetPasswordRequestSchema,
} from '@qa/contracts';
import { UserModel, WorkspaceMemberModel } from '../../db/models/index.js';
import { AuthenticatedRequest, authenticate } from '../../http/middleware/authenticate.js';
import { loginRateLimiter } from '../../http/middleware/rateLimit.js';
import { env } from '../../config/env.js';
import { emailService } from '../../services/emailService.js';

export const authRouter = Router();

const accessCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
};

const toAuthenticatedUser = (user: UserModel) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl || null,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

// POST /v1/auth/login — creates a short-lived HttpOnly cookie session.
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginRequestSchema.parse(req.body);

    const existingUser = await UserModel.findOne({
      where: { email: { [Op.iLike]: email.trim() } },
      paranoid: false,
    });

    if (!existingUser || existingUser.deletedAt || !existingUser.passwordHash) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }

    const dbUser = existingUser;

    // Single Active Session (Double Login Control): Create session & invalidate older sessions for this user
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const sessionId = await sessionManager.createSession(dbUser.id, userAgent, ipAddress);

    const token = signToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      sessionId,
    });

    res.cookie(accessTokenCookieName, token, accessCookieOptions);
    return res.status(200).json({ data: { user: toAuthenticatedUser(dbUser) } });
  } catch {
    return res.status(400).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    });
  }
});

// POST /v1/auth/forgot-password — generates token and sends zero-cost reset email
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = ForgotPasswordRequestSchema.parse(req.body);
    const user = await UserModel.findOne({
      where: { email: { [Op.iLike]: email.trim() } },
    });

    // Always respond with success to avoid email enumeration
    if (!user) {
      return res.status(200).json({
        data: { message: 'If the email exists in our system, a password reset link has been dispatched.' },
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

    return res.status(200).json({
      data: { message: 'If the email exists in our system, a password reset link has been dispatched.' },
    });
  } catch (error) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
    });
  }
});

// POST /v1/auth/reset-password — verifies reset token and updates password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = ResetPasswordRequestSchema.parse(req.body);

    const user = await UserModel.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Password reset link is invalid or has expired.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({
      data: { message: 'Your password has been successfully reset. You can now log in.' },
    });
  } catch (error) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
    });
  }
});

// POST /v1/auth/change-password — authenticated self password change
authRouter.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = ChangePasswordRequestSchema.parse(req.body);
    const user = await UserModel.findByPk(req.user!.userId);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      return res.status(400).json({
        error: { code: 'INVALID_CURRENT_PASSWORD', message: 'The current password provided is incorrect.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({
      data: { message: 'Your password has been updated successfully.' },
    });
  } catch (error) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
    });
  }
});

// PATCH /v1/auth/profile — authenticated user profile update
authRouter.patch('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, avatarUrl } = UpdateProfileRequestSchema.parse(req.body);
    const user = await UserModel.findByPk(req.user!.userId);

    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
    }

    if (name !== undefined) user.name = name.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl ? avatarUrl.trim() : null;

    await user.save();
    return res.status(200).json({ data: { user: toAuthenticatedUser(user) } });
  } catch (error) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
    });
  }
});

// POST /v1/auth/admin/reset-member-password — admin/owner resets a member's credentials
authRouter.post('/admin/reset-member-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId, newPassword } = AdminResetPasswordRequestSchema.parse(req.body);
    const actorId = req.user!.userId;

    // Verify actor is admin/owner in at least one shared workspace or global admin
    const actorUser = await UserModel.findByPk(actorId);
    if (!actorUser) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Actor user not found.' } });
    }

    let isAuthorized = actorUser.role === 'admin';
    if (!isAuthorized) {
      // Check shared workspace admin/owner role
      const sharedAdminMembership = await WorkspaceMemberModel.findOne({
        where: {
          userId: actorId,
          role: { [Op.in]: ['owner', 'admin'] },
        },
      });
      if (sharedAdminMembership) {
        // Verify target member is in that workspace
        const targetInWorkspace = await WorkspaceMemberModel.findOne({
          where: {
            workspaceId: sharedAdminMembership.workspaceId,
            userId: targetUserId,
          },
        });
        if (targetInWorkspace) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only workspace administrators or owners can reset member passwords.' },
      });
    }

    const targetUser = await UserModel.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target member user not found.' } });
    }

    const salt = await bcrypt.genSalt(10);
    targetUser.passwordHash = await bcrypt.hash(newPassword, salt);
    targetUser.passwordResetToken = null;
    targetUser.passwordResetExpiresAt = null;
    await targetUser.save();

    return res.status(200).json({
      data: { message: `Password for ${targetUser.name} (${targetUser.email}) has been reset successfully.` },
    });
  } catch (error) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
    });
  }
});

authRouter.get('/session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserModel.findByPk(req.user!.userId);
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Your session is no longer valid.' } });
  }
  return res.status(200).json({ data: { user: toAuthenticatedUser(user) } });
});

authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await sessionManager.revokeSession(req.user!.sessionId!);
  res.clearCookie(accessTokenCookieName, accessCookieOptions);
  return res.status(204).send();
});
