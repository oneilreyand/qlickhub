import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import {
  assignRequestId,
  buildServerErrorLogEntry,
  REQUEST_ID_HEADER,
  scrubSecrets,
  setErrorLogSink,
} from '../errorLog.js';
import { sendProblemDetails } from '../problemDetails.js';
import { createApp } from '../../app.js';

async function listen(app: express.Express): Promise<{ server: Server; base: string }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}

describe('Structured server-error logging (audit F2)', () => {
  let server: Server;
  let base: string;
  let appServer: Server;
  let appBase: string;
  const lines: string[] = [];
  let restoreSink: () => void;

  before(async () => {
    restoreSink = setErrorLogSink((line) => lines.push(line));
    const app = express();
    app.use(assignRequestId);
    app.post('/v1/workspaces/:workspaceId/boom', (_req, res) => {
      sendProblemDetails(
        res,
        new Error('connect failed for postgres://admin:hunter2@db.internal:5432/app'),
      );
    });
    app.get('/v1/conflict', (_req, res) => {
      sendProblemDetails(res, new Error('CONFLICT: already exists'));
    });
    ({ server, base } = await listen(app));
    ({ server: appServer, base: appBase } = await listen(createApp()));
  });

  after(async () => {
    restoreSink();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => appServer.close(() => resolve()));
  });

  it('logs one scrubbed JSON line per 5xx with request id, route, and workspace', async () => {
    lines.length = 0;
    const response = await fetch(
      `${base}/v1/workspaces/7b7d6b5e-4b8a-4c9d-9e2f-1a2b3c4d5e6f/boom?token=abc`,
      { method: 'POST', body: JSON.stringify({ password: 'secret-body' }) },
    );
    assert.strictEqual(response.status, 500);
    const requestId = response.headers.get(REQUEST_ID_HEADER);
    assert.ok(requestId);
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.event, 'api.error');
    assert.strictEqual(entry.requestId, requestId);
    assert.strictEqual(entry.route, '/v1/workspaces/:workspaceId/boom');
    assert.strictEqual(entry.workspaceId, '7b7d6b5e-4b8a-4c9d-9e2f-1a2b3c4d5e6f');
    assert.strictEqual(entry.status, 500);
    assert.strictEqual(entry.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(!lines[0].includes('hunter2'));
    assert.ok(!lines[0].includes('secret-body'));
    assert.ok(!lines[0].includes('token=abc'));
    assert.match(entry.message, /postgres:\/\/\[redacted\]/);
  });

  it('does not log client errors', async () => {
    lines.length = 0;
    const response = await fetch(`${base}/v1/conflict`);
    assert.strictEqual(response.status, 409);
    assert.strictEqual(lines.length, 0);
  });

  it('hides internal 5xx messages from Production responses', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const response = await fetch(`${base}/v1/workspaces/x/boom`, { method: 'POST' });
      const body = (await response.json()) as { detail: string };
      assert.strictEqual(response.status, 500);
      assert.strictEqual(body.detail, 'Internal server error');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('reuses a well-formed incoming request id and replaces a malformed one', async () => {
    const reused = await fetch(`${appBase}/v1/health`, {
      headers: { [REQUEST_ID_HEADER]: 'client-trace-12345678' },
    });
    assert.strictEqual(reused.headers.get(REQUEST_ID_HEADER), 'client-trace-12345678');
    const replaced = await fetch(`${appBase}/v1/health`, {
      headers: { [REQUEST_ID_HEADER]: 'bad id<script>' },
    });
    assert.notStrictEqual(replaced.headers.get(REQUEST_ID_HEADER), 'bad id<script>');
    assert.match(replaced.headers.get(REQUEST_ID_HEADER) || '', /^[0-9a-f-]{36}$/);
  });

  it('scrubs bearer tokens, JWTs, and key=value secrets', () => {
    const jwt = `eyJ${'a'.repeat(12)}.${'b'.repeat(12)}.${'c'.repeat(12)}`;
    const scrubbed = scrubSecrets(`Bearer abc.def ${jwt} api_key=XYZ password=pw1`);
    assert.ok(!scrubbed.includes('abc.def'));
    assert.ok(!scrubbed.includes(jwt));
    assert.ok(!scrubbed.includes('XYZ'));
    assert.ok(!scrubbed.includes('pw1'));
  });

  it('builds an entry for non-Error values without a request', () => {
    const entry = buildServerErrorLogEntry('plain failure', undefined, 503, 'UNAVAILABLE');
    assert.strictEqual(entry.message, 'plain failure');
    assert.strictEqual(entry.route, null);
    assert.strictEqual(entry.requestId, null);
  });
});
