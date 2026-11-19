import assert from 'node:assert';
import { createHash, randomBytes } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createApp } from '../../../app.js';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import {
  AuthSessionModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

const STORE = process.env.MCP_TEST_OAUTH_STORE === 'postgres' ? 'postgres' : 'memory';
const PORT = STORE === 'postgres' ? 47202 : 47201;
const BASE = `http://localhost:${PORT}`;
const RESOURCE = `${BASE}/mcp`;
const REDIRECT_REGISTERED = 'http://127.0.0.1/callback';
const REDIRECT_USED = 'http://127.0.0.1:51234/callback';

/** Minimal cookie jar: keeps the latest value per cookie name. */
class Jar {
  private cookies = new Map<string, string>();
  constructor(initial: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(initial)) this.cookies.set(k, v);
  }
  store(res: Response) {
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function go(jar: Jar, url: string, init: RequestInit = {}) {
  const res = await fetch(new URL(url, BASE), {
    ...init,
    redirect: 'manual',
    headers: { ...(init.headers ?? {}), cookie: jar.header() },
  });
  jar.store(res);
  return res;
}

const pkce = () => {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
};

async function registerClient(name: string) {
  const res = await fetch(`${BASE}/oauth/reg`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: name,
      redirect_uris: [REDIRECT_REGISTERED],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  assert.strictEqual(res.status, 201, await res.clone().text());
  return ((await res.json()) as { client_id: string }).client_id;
}

/** Drives authorize → interaction(s) → callback; `act` answers the login prompt. */
async function authorize(
  jar: Jar,
  clientId: string,
  challenge: string,
  act: (uid: string, page: string) => Promise<Response>,
): Promise<URL> {
  const query = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_USED,
    scope: 'mcp',
    state: 'xyz',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: RESOURCE,
  });
  let res = await go(jar, `/oauth/auth?${query}`);
  for (let hop = 0; hop < 10; hop += 1) {
    const location = res.headers.get('location');
    assert.ok(
      location,
      `hop ${hop}: expected redirect, got ${res.status} ${await res.clone().text()}`,
    );
    if (location.startsWith('http://127.0.0.1:51234/')) return new URL(location);
    const match = /\/oauth\/interaction\/([^/?]+)$/.exec(new URL(location, BASE).pathname);
    if (match) {
      const pageRes = await go(jar, location);
      const page = await pageRes.text();
      res =
        page.includes('/confirm') && !page.includes('/login') && !page.includes('/continue')
          ? await go(jar, `/oauth/interaction/${match[1]}/confirm`, { method: 'POST' })
          : await act(match[1], page);
      continue;
    }
    res = await go(jar, location);
  }
  throw new Error('authorization did not reach the callback');
}

async function token(params: Record<string, string>) {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return { status: res.status, body: (await res.json()) as Record<string, string> };
}

describe(`MCP spike S2/S3 — OAuth authorization server (store: ${STORE})`, () => {
  let server: Server;
  let user: UserModel;
  let workspace: WorkspaceModel;
  let browserCookie: string;
  const saved = { ...process.env };
  const password = 'Spike-Passw0rd!';

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    user = await UserModel.create({
      email: `mcp_oauth_${stamp}@example.com`,
      passwordHash: await bcrypt.hash(password, 4),
      name: 'OAuth Dev',
      role: 'dev',
    });
    workspace = await WorkspaceModel.create({
      name: 'OAuth WS',
      slug: `mcp-oauth-${stamp}`,
      ownerId: user.id,
    });
    await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: user.id, role: 'dev' });
    const sessionId = await sessionManager.createSession(user.id, 'browser-test', '127.0.0.1');
    browserCookie = signToken({ userId: user.id, email: user.email, role: user.role, sessionId });

    Object.assign(process.env, {
      MCP_SPIKE_ENABLED: 'true',
      MCP_SPIKE_OAUTH: 'true',
      MCP_SPIKE_RESOURCE_URL: RESOURCE,
      MCP_SPIKE_OAUTH_STORE: STORE,
      MCP_SPIKE_OAUTH_COOKIE_SECRET: 'spike-cookie-secret-0123456789abcdef0123456789',
    });
    server = createApp().listen(PORT);
    await new Promise((r) => server.once('listening', r));
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    await WorkspaceMemberModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await AuthSessionModel.destroy({ where: { userId: user.id } });
    await UserModel.destroy({ where: { id: user.id }, force: true });
    process.env = saved;
    await sequelize.close();
  });

  const activeSessions = () =>
    AuthSessionModel.count({ where: { userId: user.id, revokedAt: null } });

  test('browser session reused: DCR client, loopback port, PKCE, consent, MCP call; no new session (SP-4)', async () => {
    const sessionsBefore = await activeSessions();
    const clientId = await registerClient('Spike CLI');
    const { verifier, challenge } = pkce();
    const jar = new Jar({ [accessTokenCookieName]: browserCookie });

    const callback = await authorize(jar, clientId, challenge, (uid, page) => {
      assert.match(page, /Lanjut sebagai OAuth Dev/);
      return go(jar, `/oauth/interaction/${uid}/continue`, { method: 'POST' });
    });
    assert.strictEqual(callback.searchParams.get('state'), 'xyz');
    assert.strictEqual(callback.searchParams.get('iss'), `${BASE}/oauth`);

    const issued = await token({
      grant_type: 'authorization_code',
      code: callback.searchParams.get('code')!,
      redirect_uri: REDIRECT_USED,
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    });
    assert.strictEqual(issued.status, 200, JSON.stringify(issued.body));
    assert.ok(issued.body.access_token && issued.body.refresh_token);

    const client = new Client(
      { name: 'spike-oauth', version: '0' },
      { versionNegotiation: { mode: { pin: '2026-07-28' } } },
    );
    await client.connect(
      new StreamableHTTPClientTransport(new URL(RESOURCE), {
        requestInit: { headers: { authorization: `Bearer ${issued.body.access_token}` } },
      }),
    );
    const listed = await client.callTool({ name: 'list_my_workspaces', arguments: {} });
    assert.match(JSON.stringify(listed.content), new RegExp(workspace.id));
    await client.close();

    assert.strictEqual(await activeSessions(), sessionsBefore);
  });

  test('password login inside the OAuth flow creates no session; wrong password is refused', async () => {
    const sessionsBefore = await activeSessions();
    const clientId = await registerClient('Spike CLI 2');
    const { verifier, challenge } = pkce();
    const jar = new Jar();
    let sawError = false;
    const callback = await authorize(jar, clientId, challenge, async (uid, page) => {
      assert.match(page, /Masuk ke Qlick Hub/);
      if (!sawError) {
        sawError = true;
        const bad = await go(jar, `/oauth/interaction/${uid}/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ email: user.email, password: 'wrong' }),
        });
        assert.strictEqual(bad.status, 401);
      }
      return go(jar, `/oauth/interaction/${uid}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: user.email, password }),
      });
    });
    const issued = await token({
      grant_type: 'authorization_code',
      code: callback.searchParams.get('code')!,
      redirect_uri: REDIRECT_USED,
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    });
    assert.strictEqual(issued.status, 200, JSON.stringify(issued.body));
    assert.strictEqual(await activeSessions(), sessionsBefore);
  });

  test('refresh rotates, reused refresh is rejected, revoked access token gets 401', async () => {
    const clientId = await registerClient('Spike CLI 3');
    const { verifier, challenge } = pkce();
    const jar = new Jar({ [accessTokenCookieName]: browserCookie });
    const callback = await authorize(jar, clientId, challenge, (uid) =>
      go(jar, `/oauth/interaction/${uid}/continue`, { method: 'POST' }),
    );
    const first = await token({
      grant_type: 'authorization_code',
      code: callback.searchParams.get('code')!,
      redirect_uri: REDIRECT_USED,
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    });
    const rotated = await token({
      grant_type: 'refresh_token',
      refresh_token: first.body.refresh_token,
      client_id: clientId,
      resource: RESOURCE,
    });
    assert.strictEqual(rotated.status, 200, JSON.stringify(rotated.body));
    assert.notStrictEqual(rotated.body.refresh_token, first.body.refresh_token);
    const reused = await token({
      grant_type: 'refresh_token',
      refresh_token: first.body.refresh_token,
      client_id: clientId,
      resource: RESOURCE,
    });
    assert.strictEqual(reused.status, 400);
    assert.strictEqual(reused.body.error, 'invalid_grant');

    const revoke = await fetch(`${BASE}/oauth/token/revocation`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: rotated.body.access_token, client_id: clientId }),
    });
    assert.strictEqual(revoke.status, 200);
    const call = await fetch(RESOURCE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${rotated.body.access_token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.strictEqual(call.status, 401);
  });

  test('an unknown resource indicator is refused (audience binding)', async () => {
    const clientId = await registerClient('Spike CLI 4');
    const { challenge } = pkce();
    const query = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: REDIRECT_USED,
      scope: 'mcp',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource: 'https://other.example/mcp',
    });
    const res = await go(new Jar(), `/oauth/auth?${query}`);
    const location = res.headers.get('location') ?? '';
    assert.match(location, /error=invalid_target/);
  });

  test('authorization without PKCE is refused', async () => {
    const clientId = await registerClient('Spike CLI 5');
    const query = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: REDIRECT_USED,
      scope: 'mcp',
      resource: RESOURCE,
    });
    const res = await go(new Jar(), `/oauth/auth?${query}`);
    assert.match(res.headers.get('location') ?? '', /error=invalid_request/);
  });

  test(
    'postgres store keeps provider state in mcp_spike_oidc_store',
    { skip: STORE !== 'postgres' },
    async () => {
      const rows = await sequelize.query<{ model: string; count: string }>(
        `SELECT model, COUNT(*)::text AS count FROM mcp_spike_oidc_store GROUP BY model ORDER BY model`,
        { type: QueryTypes.SELECT },
      );
      const models = rows.map((row) => row.model);
      for (const expected of [
        'Client',
        'Grant',
        'AccessToken',
        'RefreshToken',
        'AuthorizationCode',
      ]) {
        assert.ok(models.includes(expected), `missing ${expected} in ${models.join(',')}`);
      }
    },
  );

  test(
    'a code issued by one instance is redeemed by another (shared store)',
    { skip: STORE !== 'postgres' },
    async () => {
      const other = createApp().listen(PORT + 100);
      await new Promise((r) => other.once('listening', r));
      try {
        const clientId = await registerClient('Spike CLI multi');
        const { verifier, challenge } = pkce();
        const jar = new Jar({ [accessTokenCookieName]: browserCookie });
        const callback = await authorize(jar, clientId, challenge, (uid) =>
          go(jar, `/oauth/interaction/${uid}/continue`, { method: 'POST' }),
        );
        const res = await fetch(`http://localhost:${PORT + 100}/oauth/token`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: callback.searchParams.get('code')!,
            redirect_uri: REDIRECT_USED,
            client_id: clientId,
            code_verifier: verifier,
            resource: RESOURCE,
          }),
        });
        const body = (await res.json()) as Record<string, string>;
        assert.strictEqual(res.status, 200, JSON.stringify(body));
        const call = await fetch(`http://localhost:${PORT + 100}/mcp`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
            authorization: `Bearer ${body.access_token}`,
          },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
        });
        assert.notStrictEqual(call.status, 401);
      } finally {
        await new Promise((r) => other.close(r));
      }
    },
  );
});
