/**
 * Persistent multi-session and sliding session control.
 * Supports concurrent sessions (up to MAX_CONCURRENT_SESSIONS),
 * proactive renewal/sliding extension, and selective revocation.
 */
import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { AuthSessionModel } from '../../db/models/authSession.js';
import { sequelize } from '../../db/sequelize.js';

export const MAX_CONCURRENT_SESSIONS = 5;

export const sessionManager = {
  /**
   * Create a new session for a user.
   * Allows up to MAX_CONCURRENT_SESSIONS active sessions per user.
   * If exceeded, the oldest active session is automatically retired.
   */
  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    return sequelize.transaction(async (transaction) => {
      const now = new Date();
      const activeSessions = await AuthSessionModel.findAll({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { [Op.gt]: now },
        },
        order: [['createdAt', 'ASC']],
        transaction,
      });

      // If active session count is at or above limit, revoke the oldest ones
      if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
        const excessCount = activeSessions.length - MAX_CONCURRENT_SESSIONS + 1;
        const toRevokeIds = activeSessions.slice(0, excessCount).map((s) => s.id);
        await AuthSessionModel.update(
          { revokedAt: now },
          { where: { id: { [Op.in]: toRevokeIds } }, transaction }
        );
      }

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
  async isSessionActive(
    userId: string,
    sessionId: string
  ): Promise<{ active: boolean; reason?: 'DOUBLE_LOGIN' | 'LOGOUT' | 'EXPIRED'; session?: AuthSessionModel }> {
    const session = await AuthSessionModel.findOne({ where: { id: sessionId, userId } });
    if (!session) return { active: false, reason: 'LOGOUT' };
    if (session.revokedAt) return { active: false, reason: 'DOUBLE_LOGIN' };
    if (session.expiresAt <= new Date()) return { active: false, reason: 'EXPIRED' };
    return { active: true, session };
  },

  /**
   * Extend an active session expiration (Sliding Session).
   */
  async touchSession(sessionId: string, userId?: string): Promise<Date> {
    const newExpiresAt = new Date(Date.now() + env.JWT_ACCESS_TTL_MINUTES * 60 * 1000);
    const where: any = { id: sessionId, revokedAt: null };
    if (userId) where.userId = userId;

    await AuthSessionModel.update(
      { expiresAt: newExpiresAt },
      { where }
    );
    return newExpiresAt;
  },

  /**
   * List all active sessions for a given user.
   */
  async listActiveSessions(userId: string, currentSessionId?: string) {
    const now = new Date();
    const sessions = await AuthSessionModel.findAll({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { [Op.gt]: now },
      },
      order: [['updatedAt', 'DESC']],
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      isCurrent: currentSessionId ? s.id === currentSessionId : false,
    }));
  },

  /**
   * Revoke session on explicit logout or remote termination.
   */
  async revokeSession(sessionId: string, userId?: string): Promise<void> {
    const where: any = { id: sessionId, revokedAt: { [Op.is]: null } };
    if (userId) where.userId = userId;

    await AuthSessionModel.update(
      { revokedAt: new Date() },
      { where }
    );
  },

  /**
   * Revoke all other active sessions for a user except the current one.
   */
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const [count] = await AuthSessionModel.update(
      { revokedAt: new Date() },
      {
        where: {
          userId,
          id: { [Op.ne]: currentSessionId },
          revokedAt: null,
        },
      }
    );
    return count;
  },
};

