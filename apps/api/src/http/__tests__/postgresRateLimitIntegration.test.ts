import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import express from 'express';
import { QueryTypes, Sequelize } from 'sequelize';
import { env } from '../../config/env.js';
import { sequelize } from '../../db/sequelize.js';
import { AuthSessionModel, UserModel } from '../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../modules/auth/jwt.js';
import { sessionManager } from '../../modules/auth/sessionManager.js';
import { createMetaRoutes } from '../../modules/meta/metaRoutes.js';
import { authenticate } from '../middleware/authenticate.js';
import { PostgresRateLimiter } from '../middleware/postgresRateLimiter.js';
import { createLinkPreviewRateLimiter } from '../middleware/rateLimit.js';

// PostgreSQL fixtures only: all counters, users and sessions below are persisted
// through the real migrated database. No internal interfaces or models are mocked.
const identifierSecret = `test-only-postgres-rate-limit-${randomUUID()}`;
const identifiers = new Set<string>();
const users: UserModel[] = [];
const opaque = (value: string) =>
  createHmac('sha256', identifierSecret).update(value).digest('hex');
function fixtureIdentifier(): string {
  const identifier = opaque(randomUUID());
  identifiers.add(identifier);
  return identifier;
}
const query = <T extends object>(sql: string, bind: unknown[] = []) =>
  sequelize.query<T>(sql, { bind, type: QueryTypes.SELECT, logging: false });
const buckets = (identifier: string) =>
  query<{ identifier: string; accepted_at: string[]; expires_at: string }>(
    'SELECT * FROM public.link_preview_rate_limit_buckets WHERE identifier = $1',
    [identifier],
  );
let secondDatabase: Sequelize;
const limiter = (database = sequelize, limit = 30, windowMs = 60_000) =>
  new PostgresRateLimiter(database, { limit, windowMs });

async function listen(app: express.Express) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function fixtureUserCookie(): Promise<{ cookie: string; identifier: string }> {
  const user = await UserModel.create({
    email: `pg-rate-${randomUUID()}@example.test`,
    name: 'Rate limit PostgreSQL fixture',
    role: 'dev',
  });
  users.push(user);
  const sessionId = await sessionManager.createSession(
    user.id,
    'PostgreSQL integration fixture',
    '127.0.0.1',
  );
  const identifier = opaque(`user:${user.id}`);
  identifiers.add(identifier);
  return {
    cookie: `${accessTokenCookieName}=${signToken({ userId: user.id, email: user.email, role: user.role, sessionId })}`,
    identifier,
  };
}

describe('PostgreSQL rate limit integration (SEC-001, TEST-001)', () => {
  before(async () => {
    const target = new URL(env.DATABASE_URL);
    assert.equal(env.NODE_ENV, 'test');
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname),
      'Requires a disposable local PostgreSQL database',
    );
    assert.match(target.pathname, /test/);
    await sequelize.authenticate();
    const [migration] = await query<{
      present: boolean;
    }>(`SELECT EXISTS (SELECT 1 FROM "SequelizeMeta"
      WHERE name = '20260904000065-create-link-preview-rate-limit-buckets.cjs') AS present`);
    assert.equal(migration.present, true, 'Run canonical test migrations first');
    secondDatabase = new Sequelize(env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      pool: { min: 0, max: 2 },
    });
    await secondDatabase.authenticate();
  });

  after(async () => {
    if (secondDatabase) {
      await query(
        'DELETE FROM public.link_preview_rate_limit_buckets WHERE identifier = ANY($1::text[]) RETURNING identifier',
        [[...identifiers]],
      );
      for (const user of users) {
        await AuthSessionModel.destroy({ where: { userId: user.id } });
        await user.destroy({ force: true });
        assert.equal(
          await UserModel.findByPk(user.id, { paranoid: false }),
          null,
          'PostgreSQL integration fixtures must be physically removed',
        );
      }
      await secondDatabase.close();
    }
    await sequelize.close();
  });

  test('exactly 30 concurrent requests succeed across independent pools and persist across instances', async () => {
    const identifier = fixtureIdentifier();
    const a = limiter();
    const b = limiter(secondDatabase);
    const results = await Promise.all(
      Array.from({ length: 45 }, (_, index) => (index % 2 ? a : b).limit(identifier)),
    );
    assert.equal(results.filter((result) => result.success).length, 30);
    assert.equal(results.filter((result) => !result.success).length, 15);
    assert.deepEqual(
      results
        .filter((r) => r.success)
        .map((r) => r.remaining)
        .sort((x, y) => x - y),
      Array.from({ length: 30 }, (_, i) => i),
    );
    assert.equal((await limiter(secondDatabase).limit(identifier)).success, false);
    const [row] = await buckets(identifier);
    assert.equal(row.accepted_at.length, 30);
    assert.equal(Number(row.expires_at), Math.max(...row.accepted_at.map(Number)) + 60_000);
    assert.equal((await limiter().limit(fixtureIdentifier())).success, true);
  });

  test('prunes only expired markers using the database clock and returns the oldest live reset', async () => {
    const identifier = fixtureIdentifier();
    const [clock] = await query<{ now_ms: string }>(
      'SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now_ms',
    );
    const now = Number(clock.now_ms);
    await query(
      `INSERT INTO public.link_preview_rate_limit_buckets VALUES ($1, $2::bigint[], $3) RETURNING identifier`,
      [identifier, [now - 61_000, now - 1_000], now + 59_000],
    );
    const result = await limiter().limit(identifier);
    assert.equal(result.remaining, 28);
    assert.equal(result.reset, now + 59_000);
    const [row] = await buckets(identifier);
    assert.equal(row.accepted_at.length, 2);
    assert.equal(Number(row.accepted_at[0]), now - 1_000);
    assert.ok(Number(row.accepted_at[1]) >= now);
  });

  test('does not reset live markers at fixed-minute boundaries', async () => {
    const identifier = fixtureIdentifier();
    // A two-minute test window keeps these real database-clock markers live
    // on either side of the current minute, with no fake application clock.
    await query(
      `WITH clock AS (SELECT floor(extract(epoch FROM date_trunc('minute', clock_timestamp())) * 1000)::bigint - 1 AS t)
      INSERT INTO public.link_preview_rate_limit_buckets SELECT $1, array_fill(t, ARRAY[30]), t + 120000 FROM clock RETURNING identifier`,
      [identifier],
    );
    assert.equal((await limiter(secondDatabase, 30, 120_000).limit(identifier)).success, false);
    assert.equal((await buckets(identifier))[0].accepted_at.length, 30);
  });

  test('bounded cleanup deletes at most 100 expired rows, skips locks and preserves active counters', async () => {
    const expired = Array.from({ length: 106 }, fixtureIdentifier);
    const active = fixtureIdentifier();
    await limiter().limit(active);
    await query(
      `WITH clock AS (SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS t)
      INSERT INTO public.link_preview_rate_limit_buckets SELECT key, ARRAY[t - 120000], t - 60000
      FROM clock, unnest($1::text[]) key RETURNING identifier`,
      [expired],
    );
    const lock = await secondDatabase.transaction();
    try {
      await secondDatabase.query(
        'SELECT identifier FROM public.link_preview_rate_limit_buckets WHERE identifier = $1 FOR UPDATE',
        { bind: [expired[0]], transaction: lock, logging: false },
      );
      await limiter().limit(fixtureIdentifier());
      const remaining = () =>
        query<{ count: number }>(
          'SELECT count(*)::integer AS count FROM public.link_preview_rate_limit_buckets WHERE identifier = ANY($1::text[])',
          [expired],
        );
      assert.equal((await remaining())[0].count, 6);
      assert.equal((await buckets(expired[0])).length, 1);
      await limiter().limit(fixtureIdentifier());
      assert.equal((await remaining())[0].count, 1);
      assert.equal((await buckets(active))[0].accepted_at.length, 1);
    } finally {
      await lock.rollback();
    }
    await limiter().limit(fixtureIdentifier());
    assert.equal((await buckets(expired[0])).length, 0);
  });

  test('RLS, invoker execution and grants prevent client access even with schema usage', async () => {
    const [security] = await query<{
      rls: boolean;
      definer: boolean;
      policies: number;
    }>(`SELECT c.relrowsecurity AS rls, p.prosecdef AS definer,
      (SELECT count(*)::integer FROM pg_policy WHERE polrelid = c.oid) AS policies
      FROM pg_class c, pg_proc p WHERE c.oid = 'public.link_preview_rate_limit_buckets'::regclass
      AND p.oid = 'public.consume_link_preview_rate_limit(text,integer,integer)'::regprocedure`);
    assert.deepEqual(security, { rls: true, definer: false, policies: 0 });
    for (const role of await query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')",
    )) {
      const [rights] = await query<{ read: boolean; execute: boolean }>(
        `SELECT has_table_privilege($1, 'public.link_preview_rate_limit_buckets', 'SELECT') AS read,
        has_function_privilege($1, 'public.consume_link_preview_rate_limit(text,integer,integer)', 'EXECUTE') AS execute`,
        [role.rolname],
      );
      assert.deepEqual(rights, { read: false, execute: false });
    }
    // Role and grants are transaction-scoped test fixtures, removed by rollback.
    const roleName = `qlick_rate_fixture_${randomUUID().replaceAll('-', '')}`;
    const tx = await secondDatabase.transaction();
    try {
      await secondDatabase.query(
        `CREATE ROLE "${roleName}" NOLOGIN; GRANT USAGE ON SCHEMA public TO "${roleName}"`,
        { transaction: tx },
      );
      const [rights] = await secondDatabase.query<{ read: boolean; execute: boolean }>(
        `SELECT has_table_privilege($1, 'public.link_preview_rate_limit_buckets', 'SELECT') AS read,
        has_function_privilege($1, 'public.consume_link_preview_rate_limit(text,integer,integer)', 'EXECUTE') AS execute`,
        { bind: [roleName], transaction: tx, type: QueryTypes.SELECT },
      );
      assert.deepEqual(rights, { read: false, execute: false });
      await secondDatabase.query(
        `GRANT SELECT ON public.link_preview_rate_limit_buckets TO "${roleName}"; SET LOCAL ROLE "${roleName}"`,
        { transaction: tx },
      );
      const rows = await secondDatabase.query(
        'SELECT * FROM public.link_preview_rate_limit_buckets',
        { transaction: tx, type: QueryTypes.SELECT },
      );
      assert.equal(rows.length, 0, 'RLS still hides counters if SELECT is accidentally granted');
      await assert.rejects(
        secondDatabase.query(
          'SELECT * FROM public.consume_link_preview_rate_limit($1, 30, 60000)',
          { bind: [fixtureIdentifier()], transaction: tx },
        ),
        (error: unknown) => {
          assert.equal((error as { parent?: { code?: string } }).parent?.code, '42501');
          return true;
        },
      );
    } finally {
      await tx.rollback();
    }
  });

  test('validates opaque keys and bounds, with database parameter guards and no writes on failure', async () => {
    await assert.rejects(limiter().limit('user:raw-identifier'), /opaque/);
    for (const options of [
      { limit: 0, windowMs: 60000 },
      { limit: 501, windowMs: 60000 },
      { limit: 30, windowMs: 0 },
    ]) {
      assert.throws(() => new PostgresRateLimiter(sequelize, options), /options/);
    }
    const identifier = fixtureIdentifier();
    for (const parameters of [
      [identifier, 0, 60000],
      [identifier, 30, null],
      ['raw', 30, 60000],
    ]) {
      await assert.rejects(
        query('SELECT * FROM public.consume_link_preview_rate_limit($1, $2, $3)', parameters),
      );
    }
    assert.equal((await buckets(identifier)).length, 0);
  });

  test('lock timeouts roll back; real HTTP fallback stays bounded and recovery resumes PostgreSQL', async () => {
    const identifier = opaque('ip:127.0.0.1');
    identifiers.add(identifier);
    let warningCount = 0;
    const app = express();
    app.get(
      '/counter',
      createLinkPreviewRateLimiter({
        store: 'postgres',
        limit: 2,
        skip: () => false,
        distributedLimiter: limiter(sequelize, 2),
        identifierSecret,
        onStoreFailure: () => {
          warningCount += 1;
        },
      }),
      (_req, res) => res.json({ ok: true }),
    );
    const server = await listen(app);
    const lock = await secondDatabase.transaction();
    try {
      await secondDatabase.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('qlickhub:link-preview:' || $1, 0))",
        { bind: [identifier], transaction: lock },
      );
      await assert.rejects(limiter().limit(identifier), (error: unknown) => {
        assert.equal((error as { parent?: { code?: string } }).parent?.code, '55P03');
        return true;
      });
      for (const status of [200, 200, 429]) {
        const response = await fetch(`${server.url}/counter`);
        assert.equal(response.status, status);
        await response.arrayBuffer();
      }
      assert.equal(warningCount, 1);
      assert.equal((await buckets(identifier)).length, 0, 'No detached writes survive rollback');
    } finally {
      await lock.rollback();
      await server.close();
    }
    assert.equal((await limiter().limit(identifier)).remaining, 29);
    assert.match((await buckets(identifier))[0].identifier, /^[a-f0-9]{64}$/);
    const [settings] = await query<{ lock_timeout: string; statement_timeout: string }>(
      "SELECT current_setting('lock_timeout') AS lock_timeout, current_setting('statement_timeout') AS statement_timeout",
    );
    assert.deepEqual(settings, { lock_timeout: '0', statement_timeout: '0' });
  });

  test('authenticated real meta routes share 30/minute, reject request 31 and isolate users', async () => {
    const userA = await fixtureUserCookie();
    const userB = await fixtureUserCookie();
    let warnings = 0;
    const makeApp = (database: Sequelize) => {
      const app = express();
      app.use(
        '/v1',
        authenticate,
        createLinkPreviewRateLimiter({
          store: 'postgres',
          environment: 'production',
          skip: () => false,
          identifierSecret,
          distributedLimiter: limiter(database),
          onStoreFailure: () => {
            warnings += 1;
          },
        }),
        createMetaRoutes(),
      );
      return app;
    };
    // The inner default limiter intentionally skips NODE_ENV=test. The real
    // enabled PostgreSQL middleware is mounted after the same authentication.
    const a = await listen(makeApp(sequelize));
    const b = await listen(makeApp(secondDatabase));
    const path = '/v1/meta/link-preview?url=http%3A%2F%2F127.0.0.1%2F';
    try {
      const unauthenticated = await fetch(`${a.url}${path}`);
      assert.equal(unauthenticated.status, 401);
      await unauthenticated.arrayBuffer();
      assert.equal((await buckets(userA.identifier)).length, 0);
      const results = await Promise.all(
        Array.from({ length: 31 }, async (_, index) => {
          const response = await fetch(`${(index % 2 ? a : b).url}${path}`, {
            headers: { Cookie: userA.cookie },
          });
          return {
            status: response.status,
            headers: response.headers,
            body: await response.json(),
          };
        }),
      );
      assert.equal(
        results.filter((result) => result.status === 400).length,
        30,
        'Allowed requests reach real SSRF rejection',
      );
      for (const result of results.filter((result) => result.status === 400)) {
        assert.equal((result.body as { error: { code: string } }).error.code, 'UNSAFE_URL');
      }
      const blocked = results.filter((result) => result.status === 429);
      assert.equal(blocked.length, 1);
      assert.equal((blocked[0].body as { code: string }).code, 'RATE_LIMITED');
      for (const header of ['ratelimit', 'ratelimit-policy', 'retry-after'])
        assert.ok(blocked[0].headers.get(header));
      const other = await fetch(`${b.url}${path}`, { headers: { Cookie: userB.cookie } });
      assert.equal(other.status, 400);
      await other.arrayBuffer();
      const [row] = await buckets(userA.identifier);
      assert.deepEqual(Object.keys(row).sort(), ['accepted_at', 'expires_at', 'identifier']);
      assert.equal(row.accepted_at.length, 30);
      assert.equal((await buckets(userB.identifier))[0].accepted_at.length, 1);
      assert.equal(warnings, 0, 'No fallback disguised a provider failure');
    } finally {
      await Promise.all([a.close(), b.close()]);
    }
  });
});
