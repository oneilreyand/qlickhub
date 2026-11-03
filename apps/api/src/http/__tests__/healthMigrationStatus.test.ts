import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { QueryTypes } from 'sequelize';
import { createApp } from '../../app.js';
import { sequelize } from '../../db/sequelize.js';

/** ADR-039: health reports the latest applied canonical migration from PostgreSQL. */
describe('Health migration status (ADR-039, PostgreSQL)', () => {
  let server: Server;
  let base = '';

  before(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  test('returns the same latest name and count as SequelizeMeta, and nothing else about the schema', async () => {
    const [expected] = await sequelize.query<{ latest: string; applied: string }>(
      'SELECT MAX(name) AS latest, COUNT(*) AS applied FROM "SequelizeMeta"',
      { type: QueryTypes.SELECT },
    );
    for (const path of ['/health', '/v1/health']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        status: string;
        database: { status: string; migrations?: { latest: string; applied: number } };
      };
      assert.equal(body.status, 'ok');
      assert.equal(body.database.status, 'connected');
      assert.deepEqual(body.database.migrations, {
        latest: expected.latest,
        applied: Number(expected.applied),
      });
      assert.match(body.database.migrations!.latest, /^\d{14}-[a-z0-9-]+\.cjs$/);
    }
  });
});
