/**
 * Persistent single-session control. Session validity survives process restarts
 * and revocation never falls back to trusting a JWT by itself.
 */
import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { AuthSessionModel } from '../../db/models/authSession.js';
import { sequelize } from '../../db/sequelize.js';

export const sessionManager = {
  /**
   * Create a new session for a user.
   * Automatically revokes any existing active session for this user (Double Login Prevention).
   */
  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    return sequelize.transaction(async (transaction) => {
      await AuthSessionModel.update(
        { revokedAt: new Date() },
        { where: { userId, revokedAt: null }, transaction }
      );

      const session = await AuthSessionModel.create(
        {
          userId,
          userAgent: userAgent?.slice(0, 512) || null,
          ipAddress: ipAddress || null,
          expiresAt: new Date(Date.now() + env.JWT_ACCESS_TTL_MINUTES * 60 * 1000),
          revokedAt: null,
        },
        { transaction }
      );

      return session.id;
    });
  },

  /**
   * Verify if a given sessionId for a user is still active.
   */
  async isSessionActive(userId: string, sessionId: string): Promise<{ active: boolean; reason?: 'DOUBLE_LOGIN' | 'LOGOUT' | 'EXPIRED' }> {
    const session = await AuthSessionModel.findOne({ where: { id: sessionId, userId } });
    if (!session) return { active: false, reason: 'LOGOUT' };
    if (session.revokedAt) return { active: false, reason: 'DOUBLE_LOGIN' };
    if (session.expiresAt <= new Date()) return { active: false, reason: 'EXPIRED' };
    return { active: true };
  },

  /**
   * Revoke session on explicit logout.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await AuthSessionModel.update(
      { revokedAt: new Date() },
      { where: { id: sessionId, revokedAt: { [Op.is]: null } } }
    );
  },
};
