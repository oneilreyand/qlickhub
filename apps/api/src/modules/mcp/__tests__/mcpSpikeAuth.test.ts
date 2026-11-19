import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../app.js';
import { readMcpSpikeConfig } from '../mcpSpikeConfig.js';

const DEV_TOKEN = 'spike-dev-token-0123456789abcdef0123456789';

describe('MCP spike S1 — resource server gate (no database)', () => {
  let server: Server;
  let baseUrl: string;
  const saved = { ...process.env };

  before(async () => {
    process.env.MCP_SPIKE_ENABLED = 'true';
    process.env.MCP_SPIKE_RESOURCE_URL = 'http://localhost:4000/mcp';
    process.env.MCP_SPIKE_DEV_TOKEN = DEV_TOKEN;
    process.env.MCP_SPIKE_DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    process.env = saved;
    await new Promise((r) => server.close(r));
  });

  const initialize = (token?: string) =>
    fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });

  test('missing token → 401 with RFC 9728 resource_metadata challenge', async () => {
    const res = await initialize();
    assert.strictEqual(res.status, 401);
    const challenge = res.headers.get('www-authenticate') ?? '';
    assert.match(challenge, /^Bearer /);
    assert.match(
      challenge,
      /resource_metadata="http:\/\/localhost:4000\/\.well-known\/oauth-protected-resource\/mcp"/,
    );
  });

  test('wrong token → 401 invalid_token', async () => {
    const res = await initialize('not-the-dev-token-but-long-enough-000000000');
    assert.strictEqual(res.status, 401);
    assert.match(res.headers.get('www-authenticate') ?? '', /invalid_token/);
  });

  test('protected resource metadata names the MCP resource', async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource/mcp`);
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as { resource: string; bearer_methods_supported: string[] };
    assert.strictEqual(body.resource, 'http://localhost:4000/mcp');
    assert.deepStrictEqual(body.bearer_methods_supported, ['header']);
  });

  test('a short dev token is ignored, and production never enables the spike', () => {
    assert.strictEqual(
      readMcpSpikeConfig({ MCP_SPIKE_ENABLED: 'true', MCP_SPIKE_DEV_TOKEN: 'short' }).devToken,
      undefined,
    );
    assert.strictEqual(
      readMcpSpikeConfig({ MCP_SPIKE_ENABLED: 'true', NODE_ENV: 'production' }).enabled,
      false,
    );
    assert.strictEqual(
      readMcpSpikeConfig({ MCP_SPIKE_ENABLED: 'true', VERCEL_ENV: 'production' }).enabled,
      false,
    );
  });
});

describe('MCP spike S1 — disabled by default', () => {
  test('/mcp is not mounted without MCP_SPIKE_ENABLED', async () => {
    const saved = process.env.MCP_SPIKE_ENABLED;
    delete process.env.MCP_SPIKE_ENABLED;
    const server = createApp() as unknown as {
      listen: (port: number, host: string, cb: () => void) => Server;
    };
    const http = await new Promise<Server>((resolve) => {
      const s = server.listen(0, '127.0.0.1', () => resolve(s));
    });
    const url = await Promise.resolve(`http://127.0.0.1:${(http.address() as AddressInfo).port}`);
    const res = await fetch(`${url}/mcp`, { method: 'POST' });
    assert.strictEqual(res.status, 404);
    await new Promise((r) => http.close(r));
    if (saved !== undefined) process.env.MCP_SPIKE_ENABLED = saved;
  });
});
