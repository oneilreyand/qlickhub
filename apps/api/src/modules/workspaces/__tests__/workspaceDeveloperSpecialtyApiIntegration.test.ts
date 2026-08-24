import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';

import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceMembershipActivityModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

describe('Developer specialty and delivery-area HTTP API integration (DEV-1.1)', () => {
  let server: Server;
  let baseUrl: string;
  let workspace: WorkspaceModel;
  let owner: UserModel;
  let developer: UserModel;
  let ownerCookie: string;

  async function request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Cookie: ownerCookie,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }

  before(async () => {
    await sequelize.authenticate();
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) baseUrl = `http://localhost:${address.port}/v1`;
        resolve();
      });
    });

    const stamp = Date.now();
    owner = await UserModel.create({
      email: `developer-specialty-owner-${stamp}@example.com`,
      passwordHash: 'hash',
      name: 'Specialty Workspace Owner',
      role: 'owner',
    });
    developer = await UserModel.create({
      email: `developer-specialty-member-${stamp}@example.com`,
      passwordHash: 'hash',
      name: 'Specialty Developer',
      role: 'dev',
    });
    workspace = await WorkspaceModel.create({
      name: 'Developer Specialty Integration Workspace',
      slug: `developer-specialty-${stamp}`,
      ownerId: owner.id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });

    const sessionId = await sessionManager.createSession(
      owner.id,
      'DeveloperSpecialtyIntegration',
      '127.0.0.1',
    );
    const token = signToken({ userId: owner.id, email: owner.email, role: owner.role, sessionId });
    ownerCookie = `${accessTokenCookieName}=${token}`;
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workspace) {
      await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
      await WorkspaceMembershipActivityModel.destroy({ where: { workspaceId: workspace.id } });
      await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    }
    if (owner && developer) {
      await UserModel.destroy({ where: { id: [owner.id, developer.id] }, force: true });
    }
  });

  test('new Developer membership requires specialties and returns persisted classification data', async () => {
    const invalid = await request(`/workspaces/${workspace.id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: developer.email, role: 'dev' }),
    });
    assert.strictEqual(invalid.status, 400);

    const created = await request(`/workspaces/${workspace.id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: developer.email, role: 'dev', specialties: ['backend'] }),
    });
    assert.strictEqual(created.status, 201);
    const createdBody = (await created.json()) as { data: { specialties: string[] } };
    assert.deepStrictEqual(createdBody.data.specialties, ['backend']);

    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace.id, userId: developer.id },
    });
    assert.ok(membership);
    const persisted = await WorkspaceMemberSpecialtyModel.findAll({
      where: { workspaceId: workspace.id, workspaceMemberId: membership.id },
    });
    assert.deepStrictEqual(
      persisted.map((item) => item.specialty),
      ['backend'],
    );

    const listed = await request(`/workspaces/${workspace.id}/members`);
    assert.strictEqual(listed.status, 200);
    const listedBody = (await listed.json()) as {
      data: Array<{ userId: string; specialties: string[] }>;
    };
    assert.deepStrictEqual(
      listedBody.data.find((member) => member.userId === developer.id)?.specialties,
      ['backend'],
    );
  });

  test('configured specialty is enforced for assignment and active work protects the classification', async () => {
    const parentResponse = await request(`/workspaces/${workspace.id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Specialty assignment feature', priority: 'high' }),
    });
    assert.strictEqual(parentResponse.status, 201);
    const parent = (await parentResponse.json()) as { data: { id: string } };

    const backendResponse = await request(
      `/workspaces/${workspace.id}/tasks/${parent.data.id}/subtasks`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Persist backend delivery',
          deliveryArea: 'backend',
          assigneeId: developer.id,
        }),
      },
    );
    assert.strictEqual(backendResponse.status, 201);

    const mismatched = await request(
      `/workspaces/${workspace.id}/tasks/${parent.data.id}/subtasks`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Reject unsupported mobile delivery',
          deliveryArea: 'mobile',
          assigneeId: developer.id,
        }),
      },
    );
    assert.strictEqual(mismatched.status, 400);

    const removesActiveBackend = await request(
      `/workspaces/${workspace.id}/members/${developer.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'dev', specialties: ['mobile'] }),
      },
    );
    const removesActiveBackendBody = await removesActiveBackend.json();
    assert.strictEqual(removesActiveBackend.status, 409, JSON.stringify(removesActiveBackendBody));

    const expanded = await request(`/workspaces/${workspace.id}/members/${developer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'dev', specialties: ['backend', 'mobile'] }),
    });
    assert.strictEqual(expanded.status, 200);
    const expandedBody = (await expanded.json()) as { data: { specialties: string[] } };
    assert.deepStrictEqual(expandedBody.data.specialties, ['backend', 'mobile']);

    const mobileResponse = await request(
      `/workspaces/${workspace.id}/tasks/${parent.data.id}/subtasks`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Persist supported mobile delivery',
          deliveryArea: 'mobile',
          assigneeId: developer.id,
        }),
      },
    );
    assert.strictEqual(mobileResponse.status, 201);

    const audit = await WorkspaceMembershipActivityModel.findOne({
      where: {
        workspaceId: workspace.id,
        targetUserId: developer.id,
        action: 'member_specialties_updated',
      },
      order: [['createdAt', 'DESC']],
    });
    assert.ok(audit);
    assert.deepStrictEqual(audit.metadata?.newSpecialties, ['backend', 'mobile']);
  });
});
