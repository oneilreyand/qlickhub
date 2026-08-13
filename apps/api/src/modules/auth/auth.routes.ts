import { CookieOptions, Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { accessTokenCookieName, signToken } from './jwt.js';
import { sessionManager } from './sessionManager.js';
import { LoginRequestSchema } from '@qa/contracts';
import { UserModel } from '../../db/models/index.js';
import { AuthenticatedRequest, authenticate } from '../../http/middleware/authenticate.js';
import { loginRateLimiter } from '../../http/middleware/rateLimit.js';
import { env } from '../../config/env.js';

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
