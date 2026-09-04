import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { sequelize } from '../../../db/sequelize.js';
import { UserModel } from '../../../db/models/user.js';
import { AuthSessionModel } from '../../../db/models/authSession.js';
import { sessionManager, MAX_CONCURRENT_SESSIONS } from '../sessionManager.js';

describe('Enhanced Session Manager Tests', () => {
  let testUser: UserModel;

  before(async () => {
    await sequelize.authenticate();
    testUser = await UserModel.create({
      email: `test-session-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      name: 'Session Test User',
      role: 'qa',
    });
  });

  after(async () => {
    if (testUser) {
      await AuthSessionModel.destroy({ where: { userId: testUser.id } });
      await UserModel.destroy({ where: { id: testUser.id }, force: true });
    }
  });

  test('creates a session and verifies it is active', async () => {
    const sessionId = await sessionManager.createSession(
      testUser.id,
      'Mozilla/5.0 Test Chrome',
      '127.0.0.1',
    );
    assert.ok(sessionId, 'Session ID should be generated');

    const status = await sessionManager.isSessionActive(testUser.id, sessionId);
    assert.strictEqual(status.active, true);
    assert.ok(status.session);
  });

  test('supports concurrent active sessions up to MAX_CONCURRENT_SESSIONS', async () => {
    // Create 4 more sessions (total 5)
    const sessionIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const sid = await sessionManager.createSession(
        testUser.id,
        `Device ${i + 2}`,
        `192.168.1.${i + 2}`,
      );
      sessionIds.push(sid);
    }

    const activeList = await sessionManager.listActiveSessions(testUser.id);
    assert.strictEqual(
      activeList.length,
      MAX_CONCURRENT_SESSIONS,
      `Should have exactly ${MAX_CONCURRENT_SESSIONS} active sessions`,
    );

    // Creating a 6th session should automatically retire the oldest active session
    const sixthSessionId = await sessionManager.createSession(
      testUser.id,
      'Device 6 (Overflow)',
      '192.168.1.100',
    );
    assert.ok(sixthSessionId);

    const updatedList = await sessionManager.listActiveSessions(testUser.id);
    assert.strictEqual(
      updatedList.length,
      MAX_CONCURRENT_SESSIONS,
      `Should still maintain max ${MAX_CONCURRENT_SESSIONS} active sessions`,
    );
  });

  test('touchSession extends session expiration time (Sliding Session)', async () => {
    const sessionId = await sessionManager.createSession(testUser.id, 'Sliding Test', '10.0.0.1');
    const beforeTouch = await AuthSessionModel.findByPk(sessionId);
    assert.ok(beforeTouch);

    // Wait 10ms and touch
    const newExpiresAt = await sessionManager.touchSession(sessionId, testUser.id);
    assert.ok(newExpiresAt.getTime() >= beforeTouch.expiresAt.getTime());
  });

  test('revokeOtherSessions revokes all other active sessions except current', async () => {
    const currentSessionId = await sessionManager.createSession(
      testUser.id,
      'Current Session',
      '10.0.0.2',
    );
    await sessionManager.createSession(testUser.id, 'Other Session 1', '10.0.0.3');
    await sessionManager.createSession(testUser.id, 'Other Session 2', '10.0.0.4');

    const revokedCount = await sessionManager.revokeOtherSessions(testUser.id, currentSessionId);
    assert.ok(revokedCount >= 2);

    const currentStatus = await sessionManager.isSessionActive(testUser.id, currentSessionId);
    assert.strictEqual(currentStatus.active, true, 'Current session must remain active');

    const activeList = await sessionManager.listActiveSessions(testUser.id, currentSessionId);
    assert.strictEqual(activeList.length, 1);
    assert.strictEqual(activeList[0].id, currentSessionId);
    assert.strictEqual(activeList[0].isCurrent, true);
  });

  test('revokeAllSessions revokes every active session for the user', async () => {
    const sessionIds = await Promise.all([
      sessionManager.createSession(testUser.id, 'All Session 1', '10.0.1.1'),
      sessionManager.createSession(testUser.id, 'All Session 2', '10.0.1.2'),
    ]);

    const revokedCount = await sessionManager.revokeAllSessions(testUser.id);
    assert.ok(revokedCount >= 2);

    for (const sessionId of sessionIds) {
      const status = await sessionManager.isSessionActive(testUser.id, sessionId);
      assert.strictEqual(status.active, false);
    }
    assert.deepStrictEqual(await sessionManager.listActiveSessions(testUser.id), []);
  });

  test('revokeAllSessions participates in the caller transaction', async () => {
    const sessionId = await sessionManager.createSession(
      testUser.id,
      'Rollback Session',
      '10.0.2.1',
    );

    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await sessionManager.revokeAllSessions(testUser.id, transaction);
        throw new Error('force rollback');
      }),
      /force rollback/,
    );

    assert.strictEqual((await sessionManager.isSessionActive(testUser.id, sessionId)).active, true);
  });
});
