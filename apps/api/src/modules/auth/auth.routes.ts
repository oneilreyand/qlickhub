import { CookieOptions, Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { accessTokenCookieName, signToken } from './jwt.js';
import { sessionManager } from './sessionManager.js';
import {
  LoginRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ChangePasswordRequestSchema,
  UpdateProfileRequestSchema,
  AdminResetPasswordRequestSchema,
  AuthSecurityEventQuerySchema,
} from '@qlick/contracts';
import { UserModel, WorkspaceMemberModel } from '../../db/models/index.js';
import { AuthenticatedRequest, authenticate } from '../../http/middleware/authenticate.js';
import { loginRateLimiter } from '../../http/middleware/rateLimit.js';
import { env } from '../../config/env.js';
import { emailService } from '../../services/emailService.js';
import { createPasswordResetToken, hashPasswordResetToken } from './passwordResetToken.js';
import { sequelize } from '../../db/sequelize.js';
import { authSecurityEventService } from './authSecurityEventService.js';

export const authRouter = Router();

const accessCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
};

const sendCredentialRouteError = (res: Response, error: unknown) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Invalid credential request.' },
    });
  }
  return res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to process credential request.' },
  });
};

const toAuthenticatedUser = (user: UserModel) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl || null,
  onboardingCompletedAt: user.onboardingCompletedAt
    ? user.onboardingCompletedAt.toISOString()
    : null,
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
        data: {
          message: 'If the email exists in our system, a password reset link has been dispatched.',
        },
      });
    }

    const resetToken = createPasswordResetToken();

    user.passwordResetToken = resetToken.tokenHash;
    user.passwordResetExpiresAt = resetToken.expiresAt;
    await user.save();

    const delivery = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken.token,
      user.name,
    );
    if (!delivery.sent) {
      user.passwordResetToken = null;
      user.passwordResetExpiresAt = null;
      await user.save();
    }

    return res.status(200).json({
      data: {
        message: 'If the email exists in our system, a password reset link has been dispatched.',
      },
    });
  } catch (error) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Invalid request.',
      },
    });
  }
});

// POST /v1/auth/reset-password — verifies reset token and updates password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = ResetPasswordRequestSchema.parse(req.body);
    const tokenHash = hashPasswordResetToken(token);
    const resetApplied = await sequelize.transaction(async (transaction) => {
      const user = await UserModel.findOne({
        where: {
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: { [Op.gt]: new Date() },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) return false;

      user.passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
      user.passwordResetToken = null;
      user.passwordResetExpiresAt = null;
      await user.save({ transaction });
      const revokedSessionCount = await sessionManager.revokeAllSessions(user.id, transaction);
      await authSecurityEventService.recordPasswordResetCompleted(
        user.id,
        revokedSessionCount,
        transaction,
      );
      return true;
    });

    if (!resetApplied) {
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Password reset link is invalid or has expired.' },
      });
    }

    return res.status(200).json({
      data: { message: 'Your password has been successfully reset. You can now log in.' },
    });
  } catch (error) {
    return sendCredentialRouteError(res, error);
  }
});

// POST /v1/auth/change-password — authenticated self password change
authRouter.post(
  '/change-password',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = ChangePasswordRequestSchema.parse(req.body);
      const outcome = await sequelize.transaction(async (transaction) => {
        const user = await UserModel.findByPk(req.user!.userId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!user || !user.passwordHash) return 'missing' as const;

        const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!passwordMatches) return 'invalid-password' as const;

        user.passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
        user.passwordResetToken = null;
        user.passwordResetExpiresAt = null;
        await user.save({ transaction });
        const revokedSessionCount = await sessionManager.revokeOtherSessions(
          user.id,
          req.user!.sessionId!,
          transaction,
        );
        await authSecurityEventService.recordPasswordChanged(
          user.id,
          revokedSessionCount,
          transaction,
        );
        return 'updated' as const;
      });

      if (outcome === 'missing') {
        return res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
      }
      if (outcome === 'invalid-password') {
        return res.status(400).json({
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'The current password provided is incorrect.',
          },
        });
      }

      return res.status(200).json({
        data: { message: 'Your password has been updated successfully.' },
      });
    } catch (error) {
      return sendCredentialRouteError(res, error);
    }
  },
);

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
      error: {
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Invalid request.',
      },
    });
  }
});

// POST /v1/auth/admin/reset-member-password — admin/owner resets a member's credentials
authRouter.post(
  '/admin/reset-member-password',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workspaceId, targetUserId, newPassword } = AdminResetPasswordRequestSchema.parse(
        req.body,
      );
      const actorId = req.user!.userId;
      const outcome = await sequelize.transaction(async (transaction) => {
        const memberships = await WorkspaceMemberModel.findAll({
          where: {
            workspaceId,
            userId: { [Op.in]: [actorId, targetUserId] },
          },
          order: [['userId', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const actorMembership = memberships.find((membership) => membership.userId === actorId);
        const targetMembership = memberships.find(
          (membership) => membership.userId === targetUserId,
        );
        const actorCanManage = actorMembership && ['owner', 'admin'].includes(actorMembership.role);
        const targetRoleAllowed =
          targetMembership &&
          targetMembership.role !== 'owner' &&
          (actorMembership?.role === 'owner' || targetMembership.role !== 'admin');
        if (
          actorId === targetUserId ||
          !actorCanManage ||
          !targetMembership ||
          !targetRoleAllowed
        ) {
          return 'forbidden' as const;
        }

        const targetUser = await UserModel.findByPk(targetUserId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!targetUser) return 'forbidden' as const;

        targetUser.passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
        targetUser.passwordResetToken = null;
        targetUser.passwordResetExpiresAt = null;
        await targetUser.save({ transaction });
        const revokedSessionCount = await sessionManager.revokeAllSessions(
          targetUser.id,
          transaction,
        );
        await authSecurityEventService.recordMemberPasswordReset(
          {
            workspaceId,
            actorId,
            subjectUserId: targetUser.id,
            actorWorkspaceRole: actorMembership.role as 'owner' | 'admin',
            targetWorkspaceRole: targetMembership.role,
            revokedSessionCount,
          },
          transaction,
        );
        return 'updated' as const;
      });

      if (outcome === 'forbidden') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot reset this member password in the selected Workspace.',
          },
        });
      }

      return res.status(200).json({
        data: {
          message: 'Member password reset successfully. All active sessions were signed out.',
        },
      });
    } catch (error) {
      return sendCredentialRouteError(res, error);
    }
  },
);

authRouter.get(
  '/security-events',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsedQuery = AuthSecurityEventQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid security-event query.' },
      });
    }

    try {
      const result = await authSecurityEventService.listForActor(
        req.user!.userId,
        parsedQuery.data,
      );
      if (!result) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot read security events for the selected Workspace.',
          },
        });
      }
      return res.status(200).json({ data: result });
    } catch {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to load security events.',
        },
      });
    }
  },
);

authRouter.get('/session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserModel.findByPk(req.user!.userId);
  if (!user) {
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHORIZED', message: 'Your session is no longer valid.' } });
  }
  return res.status(200).json({ data: { user: toAuthenticatedUser(user) } });
});

// POST /v1/auth/onboarding/complete — marks onboarding as completed for current authenticated user
authRouter.post(
  '/onboarding/complete',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await UserModel.findByPk(req.user!.userId);
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
    }

    const now = new Date();
    user.onboardingCompletedAt = now;
    await user.save();

    return res.status(200).json({
      data: {
        success: true,
        onboardingCompletedAt: now.toISOString(),
        user: toAuthenticatedUser(user),
      },
    });
  },
);

// POST /v1/auth/onboarding/reset — resets onboarding completion status (for testing / restart)
authRouter.post(
  '/onboarding/reset',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await UserModel.findByPk(req.user!.userId);
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
    }

    user.onboardingCompletedAt = null;
    await user.save();

    return res.status(200).json({
      data: {
        success: true,
        onboardingCompletedAt: null,
        user: toAuthenticatedUser(user),
      },
    });
  },
);

// POST /v1/auth/refresh — extends active session & issues fresh cookie
authRouter.post('/refresh', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserModel.findByPk(req.user!.userId);
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
  }

  const newExpiresAt = await sessionManager.touchSession(req.user!.sessionId!, req.user!.userId);
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: req.user!.sessionId,
  });

  res.cookie(accessTokenCookieName, token, accessCookieOptions);
  return res.status(200).json({
    data: {
      user: toAuthenticatedUser(user),
      expiresAt: newExpiresAt.toISOString(),
    },
  });
});

// GET /v1/auth/sessions — list active sessions for current user
authRouter.get('/sessions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const sessions = await sessionManager.listActiveSessions(req.user!.userId, req.user!.sessionId);
  return res.status(200).json({ data: { sessions } });
});

// DELETE /v1/auth/sessions-other — revoke all other sessions except current
authRouter.delete(
  '/sessions-other',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const count = await sessionManager.revokeOtherSessions(req.user!.userId, req.user!.sessionId!);
    return res
      .status(200)
      .json({ data: { message: `Revoked ${count} other sessions successfully.` } });
  },
);

// DELETE /v1/auth/sessions/:sessionId — revoke specific session
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const isCurrent = sessionId === req.user!.sessionId;
    await sessionManager.revokeSession(sessionId, req.user!.userId);
    if (isCurrent) {
      res.clearCookie(accessTokenCookieName, accessCookieOptions);
    }
    return res.status(200).json({ data: { message: 'Session revoked successfully.', isCurrent } });
  },
);

authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await sessionManager.revokeSession(req.user!.sessionId!, req.user!.userId);
  res.clearCookie(accessTokenCookieName, accessCookieOptions);
  return res.status(204).send();
});
