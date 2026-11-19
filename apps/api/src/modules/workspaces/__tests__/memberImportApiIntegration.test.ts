import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { MemberImportResultSchema, RoleTemplateSchema } from '@qlick/contracts';
import { createApp } from '../../../app.js';
import { sequelize } from '../../../db/sequelize.js';
import { UserModel, WorkspaceMemberModel, WorkspaceModel } from '../../../db/models/index.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';
import { sessionManager } from '../../auth/sessionManager.js';

/**
 * MEMBER-ACCESS-HUB P4 (ADR-046): role templates and CSV import over HTTP on PostgreSQL.
 * AC-4.1 templates hold managed Workspace + role sets; AC-4.2 preview validates per row, commit
 * processes only valid rows in one transaction.
 */
describe('Role templates and member import HTTP / PostgreSQL Integration', () => {
  const stamp = Date.now();
  let server: Server;
  let baseUrl: string;
  const ws: Record<string, WorkspaceModel> = {};
  const users: Record<string, UserModel> = {};
  const cookies: Record<string, string> = {};

  async function user(key: string) {
    users[key] = await UserModel.create({
      email: `${key}-import-${stamp}@example.com`,
      passwordHash: 'hashed_pw',
      name: `Import ${key}`,
      role: 'dev',
    });
    const sessionId = await sessionManager.createSession(users[key].id, 'ImportTest', '127.0.0.1');
    cookies[key] =
      `${accessTokenCookieName}=${signToken({ userId: users[key].id, email: users[key].email, role: users[key].role, sessionId })}`;
  }

  const join = (w: string, u: string, role: 'owner' | 'admin' | 'po' | 'dev' | 'qa') =>
    WorkspaceMemberModel.create({ workspaceId: ws[w].id, userId: users[u].id, role });

  const call = (actor: string, method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Cookie: cookies[actor], 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

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
    for (const key of ['lead', 'other', 'dev', 'member', 'removed']) await user(key);
    for (const key of ['alpha', 'beta', 'gamma', 'archived']) {
      ws[key] = await WorkspaceModel.create({
        name: `Import ${key} ${stamp}`,
        slug: `import-${key}-${stamp}`,
        ownerId: users.lead.id,
      });
    }
    await join('alpha', 'lead', 'owner');
    await join('beta', 'lead', 'admin');
    await join('archived', 'lead', 'owner');
    await join('gamma', 'other', 'owner');
    await join('gamma', 'lead', 'qa');
    await join('alpha', 'member', 'qa');
    await join('alpha', 'dev', 'dev');
    const removed = await join('beta', 'removed', 'qa');
    await removed.destroy();
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('AC-4.1: a template keeps managed Workspace + role sets, private to its owner', async () => {
    const created = await call('lead', 'POST', '/me/role-templates', {
      name: 'QA Mobile',
      entries: [
        { workspaceId: ws.alpha.id, role: 'qa', specialties: [] },
        { workspaceId: ws.beta.id, role: 'dev', specialties: ['mobile', 'frontend'] },
      ],
    });
    assert.strictEqual(created.status, 201, await created.clone().text());
    const template = RoleTemplateSchema.parse(((await created.json()) as { data: unknown }).data);
    assert.deepStrictEqual(
      template.entries.map((e) => [e.workspaceName, e.role, e.specialties, e.available]),
      [
        [ws.alpha.name, 'qa', [], true],
        [ws.beta.name, 'dev', ['frontend', 'mobile'], true],
      ],
    );

    // Same name (any case) → 409; a Workspace the actor does not manage → 403; bad input → 400.
    const duplicate = await call('lead', 'POST', '/me/role-templates', {
      name: 'qa mobile',
      entries: [{ workspaceId: ws.alpha.id, role: 'qa', specialties: [] }],
    });
    assert.strictEqual(duplicate.status, 409);
    const unmanaged = await call('lead', 'POST', '/me/role-templates', {
      name: 'Gamma',
      entries: [{ workspaceId: ws.gamma.id, role: 'qa', specialties: [] }],
    });
    assert.strictEqual(unmanaged.status, 403);
    const invalid = await call('lead', 'POST', '/me/role-templates', {
      name: 'Dev tanpa spesialisasi',
      entries: [{ workspaceId: ws.alpha.id, role: 'dev', specialties: [] }],
    });
    assert.strictEqual(invalid.status, 400);

    // Archiving a Workspace marks its entry unavailable instead of dropping it silently.
    await call('lead', 'POST', '/me/role-templates', {
      name: 'Arsip',
      entries: [{ workspaceId: ws.archived.id, role: 'po', specialties: [] }],
    });
    await ws.archived.update({ archivedAt: new Date() });
    const listed = await call('lead', 'GET', '/me/role-templates');
    const list = ((await listed.json()) as { data: unknown[] }).data.map((t) =>
      RoleTemplateSchema.parse(t),
    );
    assert.deepStrictEqual(
      list.map((t) => t.name),
      ['Arsip', 'QA Mobile'],
    );
    assert.strictEqual(list[0].entries[0].available, false);

    // Other people neither see nor delete it; members who manage nothing get 403.
    const otherList = await call('other', 'GET', '/me/role-templates');
    assert.deepStrictEqual(((await otherList.json()) as { data: unknown[] }).data, []);
    assert.strictEqual(
      (await call('other', 'DELETE', `/me/role-templates/${template.id}`)).status,
      404,
    );
    assert.strictEqual((await call('member', 'GET', '/me/role-templates')).status, 403);
    assert.strictEqual((await call('lead', 'DELETE', '/me/role-templates/nope')).status, 404);
    assert.strictEqual(
      (await call('lead', 'DELETE', `/me/role-templates/${list[0].id}`)).status,
      204,
    );
  });

  const rows = () => [
    { email: `New-One-${stamp}@Example.com`, workspace: ws.alpha.name, role: 'QA' },
    {
      email: `new-one-${stamp}@example.com`,
      workspace: `import-beta-${stamp}`,
      role: 'developer',
      specialties: 'fe; BE',
    },
    { email: users.removed.email, workspace: ws.beta.id, role: 'po' },
    { email: 'bukan-email', workspace: ws.alpha.name, role: 'qa' },
    { email: `x-${stamp}@example.com`, workspace: 'Tidak Ada', role: 'qa' },
    { email: `y-${stamp}@example.com`, workspace: ws.gamma.name, role: 'qa' },
    { email: `z-${stamp}@example.com`, workspace: ws.alpha.name, role: 'dev' },
    { email: `w-${stamp}@example.com`, workspace: ws.alpha.name, role: 'owner' },
    { email: `new-one-${stamp}@example.com`, workspace: ws.alpha.name, role: 'qa' },
    { email: users.member.email, workspace: ws.alpha.name, role: 'qa' },
    { email: `v-${stamp}@example.com`, workspace: ws.archived.name, role: 'qa' },
  ];

  test('AC-4.2: preview validates each row and changes nothing', async () => {
    const before = await WorkspaceMemberModel.count();
    const response = await call('lead', 'POST', '/me/member-access/import', {
      mode: 'preview',
      rows: rows(),
    });
    assert.strictEqual(response.status, 200, await response.clone().text());
    const result = MemberImportResultSchema.parse(
      ((await response.json()) as { data: unknown }).data,
    );
    assert.strictEqual(result.committed, false);
    assert.deepStrictEqual(
      result.rows.map((r) => [r.line, r.status, r.action]),
      [
        [1, 'valid', 'add'],
        [2, 'valid', 'add'],
        [3, 'valid', 'restore'],
        [4, 'invalid', null],
        [5, 'invalid', null],
        [6, 'invalid', null],
        [7, 'invalid', null],
        [8, 'invalid', null],
        [9, 'invalid', null],
        [10, 'invalid', null],
        [11, 'invalid', null],
      ],
    );
    assert.deepStrictEqual(result.rows[1].specialties, ['backend', 'frontend']);
    assert.match(result.rows[8].errors.join(' '), /Ganda dengan baris 1/);
    assert.match(result.rows[9].errors.join(' '), /Sudah menjadi anggota aktif/);
    assert.match(result.rows[5].errors.join(' '), /tidak ditemukan/);
    assert.strictEqual(result.validCount, 3);
    assert.strictEqual(result.invalidCount, 8);
    assert.strictEqual(await WorkspaceMemberModel.count(), before);
  });

  test('AC-4.2: commit processes valid rows together and skips invalid ones', async () => {
    const response = await call('lead', 'POST', '/me/member-access/import', {
      mode: 'commit',
      rows: rows(),
    });
    assert.strictEqual(response.status, 200, await response.clone().text());
    const result = MemberImportResultSchema.parse(
      ((await response.json()) as { data: unknown }).data,
    );
    assert.strictEqual(result.committed, true);
    assert.strictEqual(result.peopleInvited, 2);

    const invited = await UserModel.findOne({ where: { email: `new-one-${stamp}@example.com` } });
    assert.ok(invited, 'the email is stored lowercase');
    assert.strictEqual(invited.passwordHash, null);
    assert.ok(invited.passwordResetToken, 'an activation link is issued');
    const memberships = await WorkspaceMemberModel.findAll({ where: { userId: invited.id } });
    assert.deepStrictEqual(
      memberships.map((m) => [m.workspaceId, m.role]).sort(),
      [
        [ws.alpha.id, 'qa'],
        [ws.beta.id, 'dev'],
      ].sort(),
    );
    const restored = await WorkspaceMemberModel.findOne({
      where: { workspaceId: ws.beta.id, userId: users.removed.id },
    });
    assert.strictEqual(restored?.role, 'po');
    const activity = await WorkspaceMembershipActivityModel.findOne({
      where: { workspaceId: ws.alpha.id, targetUserId: invited.id, action: 'member_added' },
    });
    assert.strictEqual((activity?.metadata as { source?: string }).source, 'csv_import');
    for (const email of [`y-${stamp}@example.com`, `z-${stamp}@example.com`]) {
      assert.strictEqual(await UserModel.count({ where: { email } }), 0, email);
    }
    assert.strictEqual(
      await WorkspaceMemberModel.count({ where: { workspaceId: ws.gamma.id } }),
      2,
      'an unmanaged Workspace is never touched',
    );

    // Running the same file again: nothing valid is left → 422 and no change.
    const again = await call('lead', 'POST', '/me/member-access/import', {
      mode: 'commit',
      rows: rows(),
    });
    assert.strictEqual(again.status, 422);
  });

  test('import is limited to managers and to 200 rows', async () => {
    const one = [{ email: `q-${stamp}@example.com`, workspace: ws.alpha.name, role: 'qa' }];
    assert.strictEqual(
      (await call('member', 'POST', '/me/member-access/import', { mode: 'preview', rows: one }))
        .status,
      403,
    );
    const tooMany = Array.from({ length: 201 }, () => one[0]);
    assert.strictEqual(
      (await call('lead', 'POST', '/me/member-access/import', { mode: 'preview', rows: tooMany }))
        .status,
      400,
    );
  });
});
