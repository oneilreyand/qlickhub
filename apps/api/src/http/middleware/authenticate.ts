import { Request, Response, NextFunction } from 'express';
import { accessTokenFromRequest, verifyToken, JwtPayload } from '../../modules/auth/jwt.js';
import { sessionManager } from '../../modules/auth/sessionManager.js';
import { UserModel } from '../../db/models/user.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = accessTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      },
    });
  }

  try {
    const payload = verifyToken(token);
    if (!payload.sessionId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session is missing.' } });
    }

    const [sessionCheck, user] = await Promise.all([
      sessionManager.isSessionActive(payload.userId, payload.sessionId),
      UserModel.findByPk(payload.userId),
    ]);
    if (!sessionCheck.active || !user || user.role !== payload.role) {
      return res.status(401).json({
        error: {
          code: sessionCheck.reason === 'DOUBLE_LOGIN' ? 'SESSION_OVERRIDDEN' : 'UNAUTHORIZED',
          message: 'Your session is no longer valid. Please sign in again.',
        },
      });
    }

    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token.',
      },
    });
  }
};
