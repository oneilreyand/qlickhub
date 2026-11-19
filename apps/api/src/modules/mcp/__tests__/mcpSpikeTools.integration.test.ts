import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  AuthSessionModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';

const DEV_TOKEN = 'spike-dev-token-integration-0123456789abcdef';

type Era = 'legacy' | { pin: string };

describe('MCP spike S1 — tools over PostgreSQL (SP-3, SP-4)', () => {
  let dev: UserModel;
  let owner: UserModel;
  let memberWs: WorkspaceModel;
  let otherWs: WorkspaceModel;
  let ownedWs: WorkspaceModel;
  const saved = { ...process.env };

  const servers: Server[] = [];

  /** One app per principal: the S1 dev verifier maps its single token to one configured user. */
  async function connect(era: Era, userId: string): Promise<Client> {
    process.env.MCP_SPIKE_DEV_USER_ID = userId;
    const server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    servers.push(server);
    const url = new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`);
    const client = new Client(
      { name: 'spike-test', version: '0.0.0' },
      { versionNegotiation: { mode: era } },
    );
    const transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { authorization: `Bearer ${DEV_TOKEN}` } },
    });
    await client.connect(transport);
    return client;
  }

  before(async () => {
    await sequelize.authenticate();
    const stamp = Date.now();
    dev = await UserModel.create({
      email: `mcp_dev_${stamp}@example.com`,
      passwordHash: 'x',
      name: 'MCP Dev',
      role: 'dev',
    });
    owner = await UserModel.create({
      email: `mcp_owner_${stamp}@example.com`,
      passwordHash: 'x',
      name: 'MCP Owner',
      role: 'owner',
    });
    memberWs = await WorkspaceModel.create({
      name: 'MCP Member WS',
      slug: `mcp-member-${stamp}`,
      ownerId: owner.id,
    });
    otherWs = await WorkspaceModel.create({
      name: 'MCP Other WS',
      slug: `mcp-other-${stamp}`,
      ownerId: owner.id,
    });
    ownedWs = await WorkspaceModel.create({
      name: 'MCP Owned WS',
      slug: `mcp-owned-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: memberWs.id, userId: dev.id, role: 'dev' },
      { workspaceId: memberWs.id, userId: owner.id, role: 'owner' },
      { workspaceId: otherWs.id, userId: owner.id, role: 'owner' },
      { workspaceId: ownedWs.id, userId: owner.id, role: 'owner' },
    ]);

    process.env.MCP_SPIKE_ENABLED = 'true';
    process.env.MCP_SPIKE_DEV_TOKEN = DEV_TOKEN;
    process.env.MCP_SPIKE_RESOURCE_URL = 'http://localhost:4000/mcp';
  });

  after(async () => {
    for (const server of servers) await new Promise((r) => server.close(r));
    for (const ws of [memberWs, otherWs, ownedWs]) {
      if (!ws) continue;
      await WorkspaceMemberModel.destroy({ where: { workspaceId: ws.id }, force: true });
      await WorkspaceModel.destroy({ where: { id: ws.id }, force: true });
    }
    for (const user of [dev, owner])
      if (user) await UserModel.destroy({ where: { id: user.id }, force: true });
    process.env = saved;
    await sequelize.close();
  });

  for (const era of ['legacy', { pin: '2026-07-28' }] as Era[]) {
    const label = era === 'legacy' ? '2025 legacy' : '2026-07-28';

    test(`${label}: developer sees only shared tools and own Workspaces`, async () => {
      const client = await connect(era, dev.id);
      const tools = (await client.listTools()).tools.map((t) => t.name).sort();
      assert.deepStrictEqual(tools, ['get_my_profile', 'get_my_work_queue', 'list_my_workspaces']);

      const profile = await client.callTool({ name: 'get_my_profile', arguments: {} });
      assert.ok(!profile.isError);
      assert.match(JSON.stringify(profile.content), new RegExp(dev.email));

      const listed = await client.callTool({ name: 'list_my_workspaces', arguments: {} });
      const text = JSON.stringify(listed.content);
      assert.match(text, new RegExp(memberWs.id));
      assert.doesNotMatch(text, new RegExp(otherWs.id));
      await client.close();
    });

    test(`${label}: work queue for a non-member Workspace is refused without data`, async () => {
      const client = await connect(era, dev.id);
      const denied = await client.callTool({
        name: 'get_my_work_queue',
        arguments: { workspaceId: otherWs.id },
      });
      assert.strictEqual(denied.isError, true);
      assert.match(JSON.stringify(denied.content), /FORBIDDEN/);
      assert.doesNotMatch(JSON.stringify(denied.content), /MCP Other WS/);

      const allowed = await client.callTool({
        name: 'get_my_work_queue',
        arguments: { workspaceId: memberWs.id },
      });
      assert.ok(!allowed.isError, JSON.stringify(allowed.content));
      await client.close();
    });

    test(`${label}: planner sees the role-filtered probe tool (K4)`, async () => {
      const client = await connect(era, owner.id);
      const tools = (await client.listTools()).tools.map((t) => t.name);
      assert.ok(tools.includes('list_my_planner_workspaces'));
      await client.close();
    });
  }

  test('MCP calls create no login session (SP-4)', async () => {
    const before = await AuthSessionModel.count({ where: { userId: dev.id } });
    const client = await connect({ pin: '2026-07-28' }, dev.id);
    await client.callTool({ name: 'list_my_workspaces', arguments: {} });
    await client.close();
    const afterCount = await AuthSessionModel.count({ where: { userId: dev.id } });
    assert.strictEqual(afterCount, before);
  });
});
